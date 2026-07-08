package com.accenture.springai_bootcamp_demo.dto;

import com.accenture.springai_bootcamp_demo.entity.ChatMessage;
import com.accenture.springai_bootcamp_demo.entity.MessageType;
import com.accenture.springai_bootcamp_demo.entity.Role;
import java.time.Instant;

/**
 * A single message exposed to API clients.
 */
public record ChatMessageDto(
        Long id,
        Role role,
        MessageType type,
        String content,
        Instant createdAt) {
}
