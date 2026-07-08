package com.accenture.springai_bootcamp_demo.dto;

import com.accenture.springai_bootcamp_demo.entity.ChatType;

import java.time.Instant;
import java.util.List;

/**
 * A full conversation including its message history.
 */
public record ChatDto(
        String id,
        String title,
        ChatType type,
        Instant createdAt,
        Instant updatedAt,
        List<ChatMessageDto> chatMessages) {
}
