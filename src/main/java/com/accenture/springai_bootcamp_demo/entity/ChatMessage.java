package com.accenture.springai_bootcamp_demo.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A single utterance within a {@link Chat}.
 */
@Entity
@Table(name = "chatMessages")
@Getter
@Setter
@NoArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chat_id", nullable = false)
    private Chat chat;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'TEXT'")
    private MessageType type;

    @Column(nullable = false, length = 8000)
    private String content;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public static ChatMessage of(Role role, String content) {
        return of(role, MessageType.TEXT, content);
    }

    public static ChatMessage of(Role role, MessageType type, String content) {
        ChatMessage chatMessage = new ChatMessage();
        chatMessage.role = role;
        chatMessage.type = type;
        chatMessage.content = content;
        chatMessage.createdAt = Instant.now();
        return chatMessage;
    }
}