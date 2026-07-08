package com.accenture.springai_bootcamp_demo.client;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class MermaidValidator {

    public String validateAndClean(String input) {

        if (!StringUtils.hasText(input)) {
            throw new LlmException("Empty Mermaid response");
        }

        String cleaned = clean(input);

        if (!cleaned.startsWith("graph TD")) {
            throw new LlmException("Invalid Mermaid diagram: must start with graph TD");
        }

        if (cleaned.contains("```")) {
            throw new LlmException("Invalid Mermaid diagram: markdown fences detected");
        }

        if (cleaned.length() > 8000) {
            throw new LlmException("Diagram is too large");
        }

        return cleaned;
    }


    private String clean(String response) {

        return response
                .replace("```mermaid", "")
                .replace("```", "")
                .trim();
    }
}