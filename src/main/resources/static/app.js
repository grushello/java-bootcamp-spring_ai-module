const api = {
    list: () => fetch('/api/chats').then(r => r.json()),
    create: () => fetch('/api/chats', { method: 'POST' }).then(r => r.json()),
    get: (id) => fetch(`/api/chats/${id}`).then(r => r.json()),
    remove: (id) => fetch(`/api/chats/${id}`, { method: 'DELETE' }),
    send: (id, content) => fetch(`/api/chats/${id}/chatMessages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    }).then(async r => {
        if (!r.ok) {
            const problem = await r.json().catch(() => ({}));
            throw new Error(problem.detail || 'Request failed');
        }
        return r.json();
    }),
    diagram: (chatId, text) => fetch(`/api/chats/${chatId}/diagram`, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain"
        },
        body: text
    }).then(async r => {
        if (!r.ok) {
            const problem = await r.json().catch(() => ({}));
            throw new Error(problem.detail || "Request failed");
        }
        return r.json();
    }),
    llmNext: (chatId) =>
        fetch(`/api/chats/${chatId}/llm-next`, {
            method: "POST"
        }).then(r => r.json())
};

const els = {
    chatList: document.getElementById('chat-list'),
    messages: document.getElementById('chatMessages'),
    title: document.getElementById('chat-title'),
    input: document.getElementById('input'),
    send: document.getElementById('send'),
    form: document.getElementById('composer'),
    error: document.getElementById('error'),
    newChat: document.getElementById('new-chat'),
    diagramButton: document.getElementById('diagram-btn'),
    llmNextButton: document.getElementById('llm-next-btn')

};

let activeChatId = null;

mermaid.initialize({
    startOnLoad: false,
    theme: "dark"
});

function setError(message) {
    els.error.textContent = message || '';
}

function setComposerEnabled(enabled, chat = null) {
    els.input.disabled = !enabled;
    els.send.disabled = !enabled;
    els.diagramButton.disabled = !enabled;

    if (chat && chat.type === "LLM_DEBATE") {

        const hasTopic = chat.chatMessages.length > 0;

        // LLM chats use only "Generate next response"
        els.send.disabled = true;
        els.diagramButton.disabled = true;

        // Allow typing only until topic is entered
        els.input.disabled = hasTopic;

        els.input.placeholder = hasTopic
            ? "Topic selected - use 'Generate next response'"
            : "Enter debate topic...";

    } else {
        els.input.placeholder = "Type a message and press Enter...";
    }
}
function setLlmButtonEnabled(chat) {
    if (!els.llmNextButton) return;

    if (chat.type !== "LLM_DEBATE") {
        els.llmNextButton.disabled = true;
        return;
    }

    // If topic already exists, allow generating next response
    if (chat.chatMessages.length > 0) {
        els.llmNextButton.disabled = false;
        return;
    }

    // First message requires user to type a topic
    els.llmNextButton.disabled = els.input.value.trim().length === 0;
}

async function refreshChatList() {
    const chats = await api.list();

    console.log(chats);
    console.log(Array.isArray(chats));

    els.chatList.innerHTML = '';

    chats.forEach(chat => els.chatList.appendChild(renderChatItem(chat)));
}

function renderChatItem(chat) {
    const item = document.createElement('div');
    item.className = 'chat-item' + (chat.id === activeChatId ? ' active' : '');
    item.onclick = () => openChat(chat.id);

    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = chat.title;

    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = chat.messageCount;

    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '🗑';
    del.onclick = (e) => { e.stopPropagation(); deleteChat(chat.id); };

    item.append(title, count, del);
    return item;
}

function renderMessages(chat) {
    els.title.textContent = chat.title;
    els.messages.innerHTML = '';
    if (!chat.chatMessages.length) {
        els.messages.innerHTML = '<div class="empty">Write a message to start the conversation.</div>';
        return;
    }
    chat.chatMessages.forEach(m => els.messages.appendChild(renderMessage(m)));
    els.messages.scrollTop = els.messages.scrollHeight;
}

function renderMessage(message) {
    console.log("Rendering", message);

    const wrapper = document.createElement("div");
    const roleMap = {
        USER: "user",
        ASSISTANT: "assistant",
        LLM_A: "llm-a",
        LLM_B: "llm-b"
    };

    wrapper.className = `msg ${roleMap[message.role] || "assistant"}`;

    const role = document.createElement("div");
    role.className = "role";
    role.textContent = message.role;

    const body = document.createElement("div");

    if (message.type === "MERMAID") {

        mermaid.render(
            "diagram-" + message.id,
            message.content
        ).then(result => {
            body.innerHTML = result.svg;
        }).catch(err => {
            console.error(err);
            body.textContent = message.content;
        });

    } else {
        body.textContent = message.content;
    }

    wrapper.append(role, body);
    return wrapper;
}

async function openChat(id) {
    setError('');
    activeChatId = id;

    const chat = await api.get(id);

    renderMessages(chat);

    setComposerEnabled(true, chat);
    setLlmButtonEnabled(chat);

    els.input.focus();

    await refreshChatList();
}

async function startNewChat() {
    setError('');

    const chat = await api.create();

    await refreshChatList();
    await openChat(chat.id);
}
document
    .getElementById("llmChatButton")
    .addEventListener("click", startLlmChat);

async function startLlmChat() {

    const response = await fetch("/api/chats/llm-chat", {
        method: "POST"
    });

    if (!response.ok) {
        console.error("Failed to start LLM chat");
        return;
    }

    const chat = await response.json();

    await refreshChatList();

    await openChat(chat.id);
}
async function continueLlmChat() {

    if (!activeChatId) {
        setError("No chat selected");
        return;
    }

    try {
        els.llmNextButton.disabled = true;

        const currentChat = await api.get(activeChatId);

        // First call: save the topic from input
        if (currentChat.chatMessages.length === 0) {

            const topic = els.input.value.trim();

            if (!topic) {
                setError("Enter a debate topic first");
                return;
            }

            await api.send(activeChatId, topic);

            els.input.value = '';
        }

        // Generate LLM_A and LLM_B
        const chat = await api.llmNext(activeChatId);

        renderMessages(chat);

        setComposerEnabled(true, chat);

        setLlmButtonEnabled(chat);

        await refreshChatList();

    } catch (err) {
        setError(err.message);
    } finally {
        els.llmNextButton.disabled = false;
    }
}
async function deleteChat(id) {
    setError('');
    await api.remove(id);
    if (id === activeChatId) {
        activeChatId = null;

        els.title.textContent = 'Select or start a chat';
        els.messages.innerHTML = '<div class="empty">No conversation selected.</div>';

        setComposerEnabled(false);

        if (els.llmNextButton) {
            els.llmNextButton.disabled = true;
        }

        els.input.placeholder = "";
    }
    await refreshChatList();
}

async function submitMessage(content) {
    setError('');
    setComposerEnabled(false);
    appendPending(content);
    try {
        const chat = await api.send(activeChatId, content);
        renderMessages(chat);
        await refreshChatList();
    } catch (err) {
        setError(err.message);
        const chat = await api.get(activeChatId);
        renderMessages(chat);
    } finally {
        setComposerEnabled(true);
        els.input.focus();
    }
}

function appendPending(content) {
    els.messages.querySelector('.empty')?.remove();
    els.messages.appendChild(renderMessage({
        role: "USER",
        type: "TEXT",
        content
    }));
    const thinking = renderMessage({
        role: "ASSISTANT",
        type: "TEXT",
        content: "…"
    });
    thinking.classList.add('pending');
    els.messages.appendChild(thinking);
    els.messages.scrollTop = els.messages.scrollHeight;
}

async function generateDiagram() {

    const chat = await api.get(activeChatId);

    if (chat.type === "LLM_DEBATE") {
        setError("Diagrams are not available in LLM debate mode");
        return;
    }

    const text = els.input.value.trim();

    if (!text) {
        setError("Enter a description first");
        return;
    }

    try {
        els.diagramButton.disabled = true;

        const updatedChat = await api.diagram(activeChatId, text);

        renderMessages(updatedChat);
        await refreshChatList();

    } catch (err) {
        setError(err.message);
    } finally {
        els.diagramButton.disabled = false;
    }
}

els.newChat.onclick = startNewChat;
els.llmNextButton.onclick = continueLlmChat;

els.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!activeChatId) return;

    const chat = await api.get(activeChatId);

    if (chat.type === "LLM_DEBATE") {
        return;
    }

    const content = els.input.value.trim();

    if (!content) return;

    els.input.value = '';
    submitMessage(content);
});
els.input.addEventListener('input', async () => {
    if (!activeChatId) return;

    const chat = await api.get(activeChatId);

    if (chat.type === "LLM_DEBATE") {

        // Once topic exists, input stays disabled
        if (chat.chatMessages.length > 0) {
            els.input.disabled = true;
            els.llmNextButton.disabled = false;
            return;
        }

        const hasTopic = els.input.value.trim().length > 0;
        els.llmNextButton.disabled = !hasTopic;
    }
});

els.input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {

        e.preventDefault();

        const chat = await api.get(activeChatId);

        if (chat.type === "LLM_DEBATE") {
            return; // do nothing, Generate next response handles it
        }

        els.form.requestSubmit();
    }
});

els.diagramButton.onclick = generateDiagram;

refreshChatList();
