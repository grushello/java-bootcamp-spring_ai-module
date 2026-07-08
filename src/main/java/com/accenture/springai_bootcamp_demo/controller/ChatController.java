package com.accenture.springai_bootcamp_demo.controller;

import com.accenture.springai_bootcamp_demo.dto.ChatDto;
import com.accenture.springai_bootcamp_demo.dto.ChatSummaryDto;
import com.accenture.springai_bootcamp_demo.dto.CreateChatRequest;
import com.accenture.springai_bootcamp_demo.dto.SendMessageRequest;
import com.accenture.springai_bootcamp_demo.service.ChatService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chats")
@AllArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    public ResponseEntity<ChatDto> create(
            @Valid @RequestBody(required = false) CreateChatRequest request) {

        ChatDto chat = chatService.createChat(
                request == null ? new CreateChatRequest(null) : request);

        return ResponseEntity.created(
                        URI.create("/api/chats/" + chat.id()))
                .body(chat);
    }

    @GetMapping
    public List<ChatSummaryDto> list() {
        return chatService.listChats();
    }

    @GetMapping("/{chatId}")
    public ChatDto get(@PathVariable String chatId) {
        return chatService.getChat(chatId);
    }

    @DeleteMapping("/{chatId}")
    public ResponseEntity<Void> delete(@PathVariable String chatId) {
        chatService.deleteChat(chatId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{chatId}/chatMessages")
    public ChatDto sendMessage(
            @PathVariable String chatId,
            @Valid @RequestBody SendMessageRequest request) {

        return chatService.sendMessage(chatId, request);
    }

    @PostMapping("/{chatId}/diagram")
    public ChatDto generateDiagram(
            @PathVariable String chatId,
            @RequestBody String request) {

        return chatService.generateDiagram(chatId, request);
    }
}