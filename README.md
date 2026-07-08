Spring AI Bootcamp Chatbot

A conversational AI application built with Spring Boot, Spring AI, and Ollama.
The application supports normal AI conversations, LLM-to-LLM debates, and AI-generated Mermaid diagrams.

Features
  Normal Chat
Create multiple chat sessions
Send messages to an AI assistant
Store conversation history
Continue previous conversations
  LLM vs LLM Debate Mode
Start an AI debate session between two LLM agents
Provide a debate topic
Alternate responses between:
LLM_A — analytical argument generation
LLM_B — critique and counterarguments
The user only provides the initial topic
After the topic is submitted, the debate continues automatically (via the press of the button)
📊 Mermaid Diagram Generation
Generate diagrams from text descriptions
Render Mermaid diagrams directly in the chat interface
Supports visual explanations of concepts and workflows

Requirements

Before running the application, install:

Java 21 or newer

Ollama

Download a model. gemma4:e4b is set in the application.yaml file, make sure to change it, if using different model.

Verify that Ollama is running:

Clone the repository:

git clone <repository-url>

Navigate into the project:

cd spring-ai-bootcamp-chatbot

Run the Spring Boot application:

Maven
./mvnw spring-boot:run

or:

mvn spring-boot:run

The application will start on:

http://localhost:8080
