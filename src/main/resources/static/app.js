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

    // Normal messages are not allowed in LLM debate chats
    if (chat && chat.type === "LLM_DEBATE") {
        els.input.disabled = true;
        els.send.disabled = true;
        els.input.placeholder = "LLM debate mode - use 'Next response'";
    } else {
        els.input.placeholder = "";
    }
}
function setLlmButtonEnabled(chat) {
    if (!els.llmNextButton) return;

    els.llmNextButton.disabled = chat.type !== "LLM_DEBATE";
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
        els.messages.innerHTML = '<div class="empty">Say hello to start the conversation.</div>';
        return;
    }
    chat.chatMessages.forEach(m => els.messages.appendChild(renderMessage(m)));
    els.messages.scrollTop = els.messages.scrollHeight;
}

function renderMessage(message) {
    console.log("Rendering", message);

    const wrapper = document.createElement("div");
    wrapper.className = `msg ${message.role.toLowerCase()}`;

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

        const chat = await api.llmNext(activeChatId);

        renderMessages(chat);
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

    const text = els.input.value.trim();

    if (!text) {
        setError("Enter a description first");
        return;
    }

    try {
        els.diagramButton.disabled = true;

        const chat = await api.diagram(activeChatId, text);

        renderMessages(chat);
        await refreshChatList();

    } catch (err) {
        setError(err.message);
    } finally {
        els.diagramButton.disabled = false;
    }
}

els.newChat.onclick = startNewChat;
els.llmNextButton.onclick = continueLlmChat;

els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = els.input.value.trim();
    if (!content || !activeChatId) return;
    els.input.value = '';
    submitMessage(content);
});

els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        els.form.requestSubmit();
    }
});

els.diagramButton.onclick = generateDiagram;

refreshChatList();
