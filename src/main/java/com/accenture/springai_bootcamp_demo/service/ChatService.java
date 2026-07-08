package com.accenture.springai_bootcamp_demo.service;

import com.accenture.springai_bootcamp_demo.client.LlmException;
import com.accenture.springai_bootcamp_demo.client.OllamaClient;
import com.accenture.springai_bootcamp_demo.dto.ChatDto;
import com.accenture.springai_bootcamp_demo.dto.ChatSummaryDto;
import com.accenture.springai_bootcamp_demo.dto.CreateChatRequest;
import com.accenture.springai_bootcamp_demo.dto.SendMessageRequest;
import com.accenture.springai_bootcamp_demo.entity.*;
import com.accenture.springai_bootcamp_demo.mapper.ChatMapper;
import com.accenture.springai_bootcamp_demo.repository.ChatRepository;
import java.util.List;
import java.util.stream.Collectors;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orchestrates chat use-cases: creating, reading and deleting conversations,
 * and exchanging chatMessages with the AI model. The public methods read as a
 * high-level script; persistence and mapping details live in private helpers.
 */
@Slf4j
@Service
@AllArgsConstructor
public class ChatService {
    private final ChatRepository chatRepository;
    private final OllamaClient ollamaClient;
    private final ChatMapper chatMapper;

    @Transactional
    public ChatDto createChat(CreateChatRequest request) {
        Chat chat = Chat.create(ChatTitles.resolveInitial(request.title()));
        chatRepository.save(chat);
        log.info("Created chat {}", chat.getId());
        return chatMapper.toDto(chat);
    }

    @Transactional(readOnly = true)
    public List<ChatSummaryDto> listChats() {
        return chatMapper.toSummaries(chatRepository.findAllByOrderByUpdatedAtDesc());
    }

    @Transactional(readOnly = true)
    public ChatDto getChat(String chatId) {
        return chatMapper.toDto(loadChat(chatId));
    }

    @Transactional
    public void deleteChat(String chatId) {
        if (!chatRepository.existsById(chatId)) {
            throw new ChatNotFoundException(chatId);
        }
        chatRepository.deleteById(chatId);
        log.info("Deleted chat {}", chatId);
    }

    /**
     * Persists the user message, asks the model for a reply, stores it and
     * returns the refreshed conversation.
     */
    @Transactional
    public ChatDto sendMessage(String chatId, SendMessageRequest request) {
        Chat chat = loadChat(chatId);

        recordUserMessage(chat, request.content());
        String reply = ollamaClient.complete(chat.getChatMessages());
        recordAssistantMessage(chat, reply);

        chatRepository.save(chat);
        return chatMapper.toDto(chat);
    }

    @Transactional
    public ChatDto generateDiagram(String chatId, String request) {

        Chat chat = loadChat(chatId);

        String diagram = ollamaClient.generateDiagram(
                chat.getChatMessages(),
                request
        );

        chat.addMessage(
                ChatMessage.of(
                        Role.ASSISTANT,
                        MessageType.MERMAID,
                        diagram
                )
        );

        chatRepository.save(chat);

        return chatMapper.toDto(chat);
    }

    private void recordUserMessage(Chat chat, String content) {
        chat.addMessage(ChatMessage.of(Role.USER, content));
        if (ChatTitles.isPlaceholder(chat.getTitle())) {
            chat.setTitle(ChatTitles.fromFirstMessage(content));
        }
    }

    private void recordAssistantMessage(Chat chat, String content) {
        chat.addMessage(ChatMessage.of(Role.ASSISTANT, content));
    }

    private Chat loadChat(String chatId) {
        return chatRepository.findWithMessagesById(chatId)
                .orElseThrow(() -> new ChatNotFoundException(chatId));
    }

    @Transactional
    public ChatDto startLlmChat() {

        Chat chat = Chat.createLlmDebate();

        String topic = "Discuss the future of AI assistants";

        chat.addMessage(
                ChatMessage.of(
                        Role.USER,
                        topic
                )
        );

        String answerA = ollamaClient.complete(List.of(
                ChatMessage.of(
                        Role.SYSTEM,
                        "You are LLM A. Be analytical and provide a detailed argument."
                ),
                ChatMessage.of(
                        Role.USER,
                        topic
                )
        ));

        chat.addMessage(
                ChatMessage.of(
                        Role.LLM_A,
                        answerA
                )
        );

        String answerB = ollamaClient.complete(List.of(
                ChatMessage.of(
                        Role.SYSTEM,
                        """
                                You are LLM B.
                                Review LLM A's answer.
                                Critique weak points.
                                Add your own perspective.
                                """
                ),
                ChatMessage.of(
                        Role.USER,
                        answerA
                )
        ));

        chat.addMessage(
                ChatMessage.of(
                        Role.LLM_B,
                        answerB
                )
        );

        chatRepository.save(chat);

        return chatMapper.toDto(chat);
    }


    @Transactional
    public ChatDto continueLlmChat(String chatId) {

        Chat chat = loadChat(chatId);

        if (chat.getType() != ChatType.LLM_DEBATE) {
            throw new LlmException("Chat is not an LLM debate");
        }

        String context = chat.getChatMessages()
                .stream()
                .map(message ->
                        message.getRole() + ": " + message.getContent()
                )
                .collect(Collectors.joining("\n"));


        String answerA = ollamaClient.complete(List.of(
                ChatMessage.of(
                        Role.SYSTEM,
                        """
                                You are LLM A.
                                Continue the discussion.
                                Be analytical.
                                """
                ),
                ChatMessage.of(
                        Role.USER,
                        context
                )
        ));


        chat.addMessage(
                ChatMessage.of(
                        Role.LLM_A,
                        answerA
                )
        );


        String answerB = ollamaClient.complete(List.of(
                ChatMessage.of(
                        Role.SYSTEM,
                        """
                                You are LLM B.
                                Review LLM A's latest response.
                                Challenge weak arguments.
                                Add new insights.
                                """
                ),
                ChatMessage.of(
                        Role.USER,
                        answerA
                )
        ));


        chat.addMessage(
                ChatMessage.of(
                        Role.LLM_B,
                        answerB
                )
        );


        chatRepository.save(chat);

        return chatMapper.toDto(chat);
    }
}