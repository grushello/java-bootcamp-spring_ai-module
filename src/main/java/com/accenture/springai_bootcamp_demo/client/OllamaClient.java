package com.accenture.springai_bootcamp_demo.client;

import com.accenture.springai_bootcamp_demo.entity.ChatMessage;
import com.accenture.springai_bootcamp_demo.entity.Role;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class OllamaClient {

    private final ChatClient chatClient;
    private final MermaidValidator mermaidValidator;

    public OllamaClient(ChatClient.Builder builder, MermaidValidator mermaidValidator) {
        this.chatClient = builder.build();
        this.mermaidValidator = mermaidValidator;
    }

    public String complete(List<ChatMessage> history) {

        try {

            String response = chatClient.prompt()
                    .messages(toSpringMessages(history))
                    .call()
                    .content();

            if (!StringUtils.hasText(response)) {
                throw new LlmException("Model returned an empty response");
            }

            return response.trim();

        } catch (LlmException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.error("Failed to communicate with Ollama", ex);
            throw new LlmException("Failed to communicate with Ollama", ex);
        }
    }

    public String generateDiagram(List<ChatMessage> history, String request) {

        List<Message> messages = new ArrayList<>(toSpringMessages(history));

        messages.add(new SystemMessage("""
            You are a Mermaid diagram generator.

            Generate ONLY Mermaid syntax.

            Rules:
            - Start exactly with graph TD
            - No markdown fences
            - No explanation
            - Return only the diagram
            - Keep labels short
            - Every node label must use square brackets with quotes
            - Do not use parentheses
            - Do not use semicolons
            - Do not use special characters

            Example:

            graph TD
            A["SOLID Principles"] --> B["Single Responsibility"]
            B --> C["One class has one reason to change"]
            """));

        messages.add(new UserMessage(request));

        try {

            String response = chatClient.prompt()
                    .messages(messages)
                    .call()
                    .content();

            if (!StringUtils.hasText(response)) {
                throw new LlmException("Model returned an empty response");
            }

            return mermaidValidator.validateAndClean(response);

        } catch (LlmException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.error("Diagram generation failed", ex);
            throw new LlmException("Failed to generate Mermaid diagram", ex);
        }
    }

    private List<Message> toSpringMessages(List<ChatMessage> history) {

        List<Message> messages = new ArrayList<>();

        for (ChatMessage message : history) {

            switch (message.getRole()) {

                case USER ->
                        messages.add(new UserMessage(message.getContent()));

                case ASSISTANT ->
                        messages.add(new AssistantMessage(message.getContent()));

                case SYSTEM ->
                        messages.add(new SystemMessage(message.getContent()));
            }
        }

        return messages;
    }
}