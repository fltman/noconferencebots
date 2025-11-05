// NoConference AI Bot System
// Uses OpenRouter for AI bot interactions

class NoConferenceSystem {
    constructor() {
        this.state = {
            phase: 'idle', // idle, discussion, debrief
            timerInterval: null,
            timeRemaining: 0,
            observerActive: false,
            mediaRecorder: null,
            audioStream: null,
            audioQueue: [], // Queue for audio chunks to process
            isProcessingQueue: false // Flag to prevent concurrent processing
        };

        this.config = {
            openRouterApiKey: localStorage.getItem('openrouter_api_key') || '',
            discussionTime: 5,
            debriefTime: 3
        };

        this.inbox = [];
        this.topics = {
            1: null,
            2: null,
            3: null,
            4: null
        };

        this.whiteboards = {
            main: [],
            1: [],
            2: [],
            3: [],
            4: []
        };

        // Room conversation histories (includes moderator + all bot messages)
        this.roomConversations = {
            1: [],
            2: [],
            3: [],
            4: []
        };

        // Bot configurations - load from localStorage or use defaults
        this.bots = this.loadBotConfigs();

        // Moderator bots
        this.moderators = {
            main: {
                id: 'main-moderator',
                name: 'Main Moderator',
                model: 'anthropic/claude-sonnet-4.5',
                systemPrompt: 'You are the main conference moderator. You facilitate debrief sessions, synthesize insights from breakout rooms, and capture key learnings on the whiteboard. Keep discussions focused and productive. Use markdown formatting in your responses: **bold** for emphasis, bullet lists for key points, and ## headings for structure.',
                messageHistory: []
            },
            1: this.createRoomModerator(1),
            2: this.createRoomModerator(2),
            3: this.createRoomModerator(3),
            4: this.createRoomModerator(4)
        };

        this.init();
    }

    createRoomModerator(roomNumber) {
        return {
            id: `moderator-${roomNumber}`,
            name: `Room ${roomNumber} Moderator`,
            model: 'anthropic/claude-sonnet-4.5',
            systemPrompt: `You are a breakout room moderator. You facilitate focused discussions on specific topics, ask clarifying questions, ensure all participants contribute, and capture key insights.

CRITICAL RULES:
1. Keep the discussion strictly focused on the assigned topic - do not allow drift to unrelated subjects
2. Redirect participants immediately if they go off-topic
3. When synthesizing insights at the end, ONLY summarize what was actually discussed in the conversation provided to you
4. Never invent or hallucinate insights that weren't discussed
5. Your summary must directly answer or address the original topic

Use markdown formatting: **bold** for key points, bullet lists for insights. Summarize in 2-3 concise bullet points that capture what participants actually said about the topic.`,
            messageHistory: []
        };
    }

    getDefaultBots() {
        return [
            {
                id: 'bot1',
                name: 'Analyzer',
                avatar: '🔍',
                model: 'anthropic/claude-sonnet-4.5',
                systemPrompt: 'You are an analytical thinker who breaks down complex topics into their core components. You ask probing questions and seek to understand underlying mechanisms.',
                messageHistory: [],
                currentRoom: 'main'
            },
            {
                id: 'bot2',
                name: 'Optimist',
                avatar: '🌟',
                model: 'google/gemini-2.5-flash',
                systemPrompt: 'You are an optimistic innovator who sees opportunities and potential in every discussion. You build on ideas and suggest creative solutions.',
                messageHistory: [],
                currentRoom: 'main'
            },
            {
                id: 'bot3',
                name: 'Skeptic',
                avatar: '🤔',
                model: 'x-ai/grok-4-fast',
                systemPrompt: 'You are a critical thinker who challenges assumptions and identifies potential problems. You ask "what if" questions and consider edge cases.',
                messageHistory: [],
                currentRoom: 'main'
            },
            {
                id: 'bot4',
                name: 'Pragmatist',
                avatar: '⚙️',
                model: 'anthropic/claude-sonnet-4.5',
                systemPrompt: 'You are a practical thinker focused on implementation and real-world applicability. You consider resources, constraints, and actionable steps.',
                messageHistory: [],
                currentRoom: 'main'
            },
            {
                id: 'bot5',
                name: 'Synthesizer',
                avatar: '🧩',
                model: 'google/gemini-2.5-flash',
                systemPrompt: 'You are skilled at finding connections between ideas and synthesizing different perspectives into coherent insights. You bridge viewpoints.',
                messageHistory: [],
                currentRoom: 'main'
            },
            {
                id: 'bot6',
                name: 'Visionary',
                avatar: '🚀',
                model: 'x-ai/grok-4-fast',
                systemPrompt: 'You think about future implications and long-term consequences. You imagine possibilities beyond the immediate scope of the discussion.',
                messageHistory: [],
                currentRoom: 'main'
            },
            {
                id: 'bot7',
                name: 'Researcher',
                avatar: '📚',
                model: 'anthropic/claude-sonnet-4.5',
                systemPrompt: 'You are detail-oriented and evidence-based. You reference relevant research, data, and examples to support arguments and deepen understanding.',
                messageHistory: [],
                currentRoom: 'main'
            },
            {
                id: 'bot8',
                name: 'Ethicist',
                avatar: '⚖️',
                model: 'google/gemini-2.5-flash',
                systemPrompt: 'You focus on moral and ethical implications. You consider fairness, justice, and the impact on different stakeholders.',
                messageHistory: [],
                currentRoom: 'main'
            },
            {
                id: 'bot9',
                name: 'Creative',
                avatar: '🎨',
                model: 'x-ai/grok-4-fast',
                systemPrompt: 'You think outside the box and propose unconventional solutions. You make unexpected connections and challenge conventional thinking.',
                messageHistory: [],
                currentRoom: 'main'
            },
            {
                id: 'bot10',
                name: 'Economist',
                avatar: '💰',
                model: 'anthropic/claude-sonnet-4.5',
                systemPrompt: 'You analyze costs, benefits, and economic implications. You think about incentives, market forces, and resource allocation.',
                messageHistory: [],
                currentRoom: 'main'
            },
            {
                id: 'bot11',
                name: 'Technologist',
                avatar: '💻',
                model: 'google/gemini-2.5-flash',
                systemPrompt: 'You understand technical feasibility and implementation details. You consider scalability, performance, and technical constraints.',
                messageHistory: [],
                currentRoom: 'main'
            },
            {
                id: 'bot12',
                name: 'Psychologist',
                avatar: '🧠',
                model: 'x-ai/grok-4-fast',
                systemPrompt: 'You analyze human behavior, motivations, and cognitive biases. You consider how people will actually use and respond to ideas.',
                messageHistory: [],
                currentRoom: 'main'
            }
        ];
    }

    loadBotConfigs() {
        const saved = localStorage.getItem('bot_configs');
        if (saved) {
            try {
                const configs = JSON.parse(saved);
                // Ensure runtime properties exist
                return configs.map(bot => ({
                    ...bot,
                    messageHistory: [],
                    currentRoom: 'main'
                }));
            } catch (error) {
                console.error('Error loading bot configs:', error);
            }
        }
        return this.getDefaultBots();
    }

    saveBotConfigs() {
        // Save only the configuration part, not runtime state
        const configs = this.bots.map(bot => ({
            id: bot.id,
            name: bot.name,
            avatar: bot.avatar,
            model: bot.model,
            systemPrompt: bot.systemPrompt
        }));
        localStorage.setItem('bot_configs', JSON.stringify(configs));
        this.addLog('Bot configurations saved', 'success');
    }

    resetBotConfigs() {
        if (confirm('Reset all bots to default configurations?')) {
            localStorage.removeItem('bot_configs');
            this.bots = this.getDefaultBots();
            this.renderBots();
            this.renderBotConfigModal();
            this.addLog('Bot configurations reset to defaults', 'success');
        }
    }

    openBotConfig() {
        this.renderBotConfigModal();
        document.getElementById('bot-config-modal').style.display = 'flex';
    }

    closeBotConfig() {
        document.getElementById('bot-config-modal').style.display = 'none';
    }

    renderBotConfigModal() {
        const container = document.getElementById('bot-config-list');
        container.innerHTML = this.bots.map(bot => `
            <div class="bot-config-item">
                <h4><span>${bot.avatar}</span> Bot ${bot.id.replace('bot', '')}</h4>
                <div class="config-field">
                    <label>Name</label>
                    <input type="text" data-bot="${bot.id}" data-field="name" value="${bot.name}">
                </div>
                <div class="config-field">
                    <label>Avatar (emoji)</label>
                    <input type="text" data-bot="${bot.id}" data-field="avatar" value="${bot.avatar}" maxlength="2">
                </div>
                <div class="config-field">
                    <label>Model</label>
                    <input type="text" data-bot="${bot.id}" data-field="model" value="${bot.model}" placeholder="e.g., anthropic/claude-sonnet-4.5">
                </div>
                <div class="config-field">
                    <label>System Prompt</label>
                    <textarea data-bot="${bot.id}" data-field="systemPrompt">${bot.systemPrompt}</textarea>
                </div>
            </div>
        `).join('');
    }

    saveBotConfigsFromModal() {
        // Get all input fields
        const inputs = document.querySelectorAll('#bot-config-list input, #bot-config-list textarea');

        inputs.forEach(input => {
            const botId = input.getAttribute('data-bot');
            const field = input.getAttribute('data-field');
            const bot = this.bots.find(b => b.id === botId);

            if (bot && field) {
                bot[field] = input.value;
            }
        });

        this.saveBotConfigs();
        this.renderBots();
        this.closeBotConfig();
    }

    init() {
        this.checkApiKey();
        this.setupEventListeners();
        this.renderBots();

        // Show API key status
        const hasOpenRouter = !!this.config.openRouterApiKey;
        const hasOpenAI = !!localStorage.getItem('openai_api_key');

        this.addLog('System initialized. Add topics to inbox and start a cycle.', 'info');
        this.addLog(`API Keys: OpenRouter ${hasOpenRouter ? '✓' : '✗'} | OpenAI ${hasOpenAI ? '✓' : '✗'}`, hasOpenRouter ? 'success' : 'warning');

        if (!hasOpenAI) {
            this.addLog('💡 Observer Bot requires OpenAI API key. Add it to enable audio transcription.', 'info');
        }
    }

    checkApiKey() {
        // Check OpenRouter API key
        if (!this.config.openRouterApiKey) {
            const key = prompt('Welcome to NoConference!\n\nPlease enter your OpenRouter API key:\n(Get one at: https://openrouter.ai/keys)');
            if (key) {
                this.config.openRouterApiKey = key;
                localStorage.setItem('openrouter_api_key', key);
                this.addLog('✓ OpenRouter API key configured', 'success');
            } else {
                alert('OpenRouter API key is required for AI bots. You can add it later in the browser console: localStorage.setItem("openrouter_api_key", "your-key")');
            }
        }

        // Check OpenAI API key (for Observer Bot / Whisper)
        const openaiKey = localStorage.getItem('openai_api_key');
        if (!openaiKey) {
            const key = prompt('For the Observer Bot (audio transcription), please enter your OpenAI API key:\n(Get one at: https://platform.openai.com/api-keys)\n\nYou can skip this now and add it later if you don\'t plan to use the Observer Bot.');
            if (key && key.trim().length > 0) {
                localStorage.setItem('openai_api_key', key);
                this.addLog('✓ OpenAI API key configured for Observer Bot', 'success');
            } else {
                this.addLog('⚠️ OpenAI API key not set. Observer Bot will prompt for it when activated.', 'info');
            }
        }
    }

    setupEventListeners() {
        // Cycle controls
        document.getElementById('start-cycle').addEventListener('click', () => this.startCycle());
        document.getElementById('stop-cycle').addEventListener('click', () => this.stopCycle());

        // Topic management
        document.getElementById('add-topic').addEventListener('click', () => this.addTopic());
        document.getElementById('new-topic').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addTopic();
            }
        });

        // Observer bot
        document.getElementById('toggle-observer').addEventListener('click', () => this.toggleObserver());

        // Test microphone
        document.getElementById('test-speech').addEventListener('click', () => this.testMicrophone());

        // Clear transcript history
        document.getElementById('clear-history').addEventListener('click', () => this.clearTranscriptHistory());

        // Bot configuration
        document.getElementById('configure-bots').addEventListener('click', () => this.openBotConfig());
        document.getElementById('close-bot-config').addEventListener('click', () => this.closeBotConfig());
        document.getElementById('cancel-bot-config').addEventListener('click', () => this.closeBotConfig());
        document.getElementById('save-bot-configs').addEventListener('click', () => this.saveBotConfigsFromModal());
        document.getElementById('reset-bot-configs').addEventListener('click', () => this.resetBotConfigs());

        // Whiteboard export
        document.getElementById('export-main-whiteboard').addEventListener('click', () => this.exportWhiteboard('main'));

        // Timer settings
        document.getElementById('discussion-time').addEventListener('change', (e) => {
            this.config.discussionTime = parseInt(e.target.value);
        });
        document.getElementById('debrief-time').addEventListener('change', (e) => {
            this.config.debriefTime = parseInt(e.target.value);
        });

        // Kiosk mode
        document.getElementById('kiosk-mode').addEventListener('click', () => this.toggleKioskMode());

        // Exit kiosk mode on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.kioskMode) {
                this.exitKioskMode();
            }
        });

        // Handle fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.state.kioskMode) {
                this.exitKioskMode();
            }
        });

        // Load available microphones
        this.loadMicrophones();
    }

    addTopic() {
        const input = document.getElementById('new-topic');
        const text = input.value.trim();

        if (text) {
            this.inbox.push({
                id: Date.now(),
                text: text,
                timestamp: new Date(),
                assigned: false
            });

            input.value = '';
            this.renderInbox();
            this.addLog(`New topic added: "${text.substring(0, 50)}..."`, 'info');
        }
    }

    renderInbox() {
        const container = document.getElementById('inbox-list');
        container.innerHTML = '';

        if (this.inbox.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); font-style: italic; font-size: 13px;">No topics in inbox. Add some above!</p>';
            return;
        }

        this.inbox.forEach(topic => {
            const div = document.createElement('div');
            div.className = `topic-item ${topic.assigned ? 'assigned' : ''}`;
            const sourceIcon = topic.source === 'observer' ? '🎤 ' : '';
            div.innerHTML = `
                <span>${sourceIcon}${topic.text}</span>
                ${!topic.assigned ? `<button class="topic-remove" onclick="noConference.removeTopic(${topic.id})">×</button>` : '<span style="font-size: 11px; color: var(--text-secondary);">Assigned</span>'}
            `;
            container.appendChild(div);
        });
    }

    removeTopic(topicId) {
        this.inbox = this.inbox.filter(t => t.id !== topicId);
        this.renderInbox();
        this.addLog('Topic removed from inbox', 'info');
    }

    renderBots() {
        // Render in bot roster
        const roster = document.getElementById('bot-list');
        roster.innerHTML = '';

        this.bots.forEach(bot => {
            const div = document.createElement('div');
            div.className = 'bot-item';
            div.innerHTML = `
                <div class="bot-avatar">${bot.avatar}</div>
                <div>
                    <div style="font-weight: 600;">${bot.name}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">${bot.model.split('/')[1]}</div>
                </div>
                <div class="bot-status ${bot.currentRoom !== 'main' ? 'in-room' : ''}"></div>
            `;
            roster.appendChild(div);
        });

        // Render in main room
        this.renderMainRoomParticipants();
    }

    renderMainRoomParticipants() {
        const container = document.getElementById('main-participants');
        container.innerHTML = '';

        const botsInMain = this.bots.filter(bot => bot.currentRoom === 'main');

        botsInMain.forEach(bot => {
            const div = document.createElement('div');
            div.className = 'participant-bot';
            div.innerHTML = `
                <div class="bot-avatar">${bot.avatar}</div>
                <div class="bot-name">${bot.name}</div>
            `;
            container.appendChild(div);
        });
    }

    async startCycle() {
        if (this.state.phase !== 'idle') {
            alert('A cycle is already running!');
            return;
        }

        // Update UI to show cycle is starting
        document.getElementById('start-cycle').disabled = true;
        document.getElementById('stop-cycle').disabled = false;

        // Check if we have enough topics, if not wait for them
        let availableTopics = this.inbox.filter(t => !t.assigned);
        if (availableTopics.length < 4) {
            const needed = 4 - availableTopics.length;
            this.addLog(`⏳ Cycle ready to start - waiting for ${needed} more topic${needed > 1 ? 's' : ''}... (${availableTopics.length}/4)`, 'info');

            this.state.phase = 'waiting';
            document.getElementById('cycle-phase').textContent = `Waiting for topics (${availableTopics.length}/4)`;
            document.getElementById('cycle-phase').style.background = 'var(--warning-color)';
            document.getElementById('main-room-status').textContent = `Waiting for ${needed} more topic${needed > 1 ? 's' : ''}...`;

            // Poll every 2 seconds until we have 4 topics or cycle is stopped
            while (this.state.phase === 'waiting') {
                await new Promise(resolve => setTimeout(resolve, 2000));

                availableTopics = this.inbox.filter(t => !t.assigned);
                const stillNeeded = 4 - availableTopics.length;

                if (availableTopics.length >= 4) {
                    this.addLog('✓ Enough topics available - starting cycle now!', 'success');
                    break;
                } else {
                    // Update UI with current count
                    document.getElementById('cycle-phase').textContent = `Waiting for topics (${availableTopics.length}/4)`;
                    document.getElementById('main-room-status').textContent = `Waiting for ${stillNeeded} more topic${stillNeeded > 1 ? 's' : ''}...`;
                    console.log(`Still waiting for topics: ${availableTopics.length}/4`);
                }
            }

            // If cycle was stopped while waiting, abort
            if (this.state.phase !== 'waiting') {
                this.addLog('Cycle start cancelled', 'info');
                return;
            }
        }

        this.addLog('Starting new conference cycle...', 'success');

        // Update UI
        document.getElementById('cycle-phase').textContent = 'Discussion';
        document.getElementById('cycle-phase').style.background = 'var(--primary-color)';

        // Assign topics to rooms
        await this.assignTopicsToRooms();

        // Bots choose rooms
        await this.botsChooseRooms();

        // Start discussion phase
        this.state.phase = 'discussion';
        this.state.timeRemaining = this.config.discussionTime * 60;
        this.startTimer();
        document.getElementById('main-room-status').textContent = 'Discussion in progress...';
        document.getElementById('moderator-action').textContent = 'Waiting for breakout rooms to finish...';

        // Run discussions in all rooms
        try {
            await this.runBreakoutDiscussions();
        } catch (error) {
            console.error('Error during breakout discussions:', error);
            this.addLog(`Discussion phase error: ${error.message}`, 'warning');
        }

        // Start debrief phase
        try {
            await this.startDebriefPhase();
        } catch (error) {
            console.error('Error during debrief phase:', error);
            this.addLog(`Debrief phase error: ${error.message}`, 'warning');
            // Still try to end the cycle cleanly
            await this.endCycle();
        }
    }

    async assignTopicsToRooms() {
        const availableTopics = this.inbox.filter(t => !t.assigned);

        for (let i = 1; i <= 4; i++) {
            const topic = availableTopics[i - 1];
            topic.assigned = true;
            this.topics[i] = topic;

            document.getElementById(`topic-${i}`).textContent = topic.text;
            document.getElementById(`topic-${i}`).classList.add('has-topic');

            this.addLog(`Room ${i} assigned topic: "${topic.text.substring(0, 40)}..."`, 'info');
        }

        this.renderInbox();
    }

    async botsChooseRooms() {
        this.addLog('Bots selecting discussion rooms...', 'info');

        // Simulate bots choosing rooms based on interest
        // In a real implementation, we could ask each bot which topic they're most interested in

        const roomChoices = [1, 2, 3, 4];

        for (const bot of this.bots) {
            // Randomly assign for now, but could use AI to make intelligent choices
            const roomChoice = roomChoices[Math.floor(Math.random() * roomChoices.length)];
            bot.currentRoom = roomChoice;

            // Render bot in room
            this.addBotToRoomUI(bot, roomChoice);
            this.addLog(`${bot.name} joined Room ${roomChoice}`, 'info');
        }

        this.renderBots();
    }

    addBotToRoomUI(bot, roomNumber) {
        const container = document.getElementById(`participants-${roomNumber}`);

        if (container.querySelector('.placeholder')) {
            container.innerHTML = '';
        }

        const span = document.createElement('span');
        span.className = 'room-participant';
        span.innerHTML = `${bot.avatar} ${bot.name}`;
        container.appendChild(span);

        // Mark room as active
        document.querySelector(`[data-room="${roomNumber}"]`).classList.add('active');
    }

    async runBreakoutDiscussions() {
        this.addLog('Breakout room discussions starting...', 'success');

        // Run discussions in all 4 rooms simultaneously
        const roomPromises = [1, 2, 3, 4].map(async roomNum => {
            try {
                await this.runRoomDiscussion(roomNum);
            } catch (error) {
                console.error(`Error in room ${roomNum}:`, error);
                this.addLog(`Room ${roomNum} discussion failed: ${error.message}`, 'warning');
            }
        });

        await Promise.all(roomPromises);

        this.addLog('All breakout discussions completed!', 'success');
    }

    async runRoomDiscussion(roomNumber) {
        const topic = this.topics[roomNumber];
        const botsInRoom = this.bots.filter(b => b.currentRoom === roomNumber);
        const moderator = this.moderators[roomNumber];

        if (botsInRoom.length === 0) {
            this.addLog(`Room ${roomNumber} has no participants, skipping...`, 'warning');
            return;
        }

        this.addLog(`Room ${roomNumber} discussion started with ${botsInRoom.length} participants`, 'info');
        this.clearRoomConversation(roomNumber);

        // Get transcript context from Observer Bot if available (async - generates AI summary)
        const transcriptContext = await this.getTranscriptContext();
        const contextPrompt = transcriptContext
            ? `\n\nBackground context from previous meeting transcripts:\n${transcriptContext}\n\nUse this context to inform the discussion.`
            : '';

        if (transcriptContext) {
            const contextLength = transcriptContext.length;
            this.addLog(`✓ Room ${roomNumber} context enabled: ${this.state.transcriptBuffer.length} transcript segments (${contextLength} chars)`, 'success');
            this.addLog(`  → All bots will receive AI-generated context summary + room conversation`, 'info');
        } else {
            this.addLog(`Room ${roomNumber}: No transcript context available (Observer Bot inactive)`, 'info');
        }

        // Moderator introduces the topic
        const intro = await this.callOpenRouter(moderator,
            `Introduce this topic for discussion: "${topic.text}". Ask an opening question to the group that directly addresses this specific topic. Keep it brief (2-3 sentences).${contextPrompt}`
        );
        this.addRoomMessage(roomNumber, 'Moderator', '🎯', intro, true);

        // Each bot responds to the opening
        for (const bot of botsInRoom) {
            const botPrompt = transcriptContext
                ? `TOPIC: "${topic.text}"\n\nThe moderator says: "${intro}"\n\nIMPORTANT: Respond specifically to the topic above. Share your initial thoughts based on your perspective. Keep it concise (2-3 sentences).\n\n${transcriptContext}`
                : `TOPIC: "${topic.text}"\n\nThe moderator says: "${intro}"\n\nIMPORTANT: Respond specifically to the topic above. Share your initial thoughts based on your perspective. Keep it concise (2-3 sentences).`;

            const response = await this.callOpenRouter(bot,
                botPrompt,
                this.getRoomContext(roomNumber)
            );

            this.addRoomMessage(roomNumber, bot.name, bot.avatar, response);
            bot.messageHistory.push({
                role: 'assistant',
                content: response,
                room: roomNumber
            });
        }

        // Continue discussion rounds until timer runs low (keep 30s for synthesis)
        let round = 0;
        while (this.state.phase === 'discussion' && this.state.timeRemaining > 30) {
            round++;
            console.log(`Room ${roomNumber} starting round ${round} (${this.state.timeRemaining}s remaining)`);

            const question = await this.callOpenRouter(moderator,
                `TOPIC: "${topic.text}"\n\nBased on what has been discussed about this topic, ask a follow-up question to deepen the conversation. Stay focused on the topic. Keep it brief.${contextPrompt}`,
                this.getRoomContext(roomNumber)
            );

            this.addRoomMessage(roomNumber, 'Moderator', '🎯', question, true);

            // Bots respond
            for (const bot of botsInRoom) {
                // Check time before each bot response
                if (this.state.phase !== 'discussion' || this.state.timeRemaining <= 30) {
                    console.log(`Room ${roomNumber} stopping mid-round - time running out`);
                    break;
                }

                const botPrompt = transcriptContext
                    ? `TOPIC: "${topic.text}"\n\nThe moderator asks: "${question}"\n\nIMPORTANT: Answer the question while staying focused on the topic above. Respond based on your perspective. Reference what others have said if relevant. Keep it concise.\n\n${transcriptContext}`
                    : `TOPIC: "${topic.text}"\n\nThe moderator asks: "${question}"\n\nIMPORTANT: Answer the question while staying focused on the topic above. Respond based on your perspective. Reference what others have said if relevant. Keep it concise.`;

                const response = await this.callOpenRouter(bot,
                    botPrompt,
                    this.getRoomContext(roomNumber)
                );

                this.addRoomMessage(roomNumber, bot.name, bot.avatar, response);
                bot.messageHistory.push({
                    role: 'assistant',
                    content: response,
                    room: roomNumber
                });
            }

            // Brief pause between rounds (helps with pacing and allows timer to tick)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`Room ${roomNumber} completed ${round} rounds of discussion`);

        // Moderator synthesizes insights
        const fullConversation = this.getRoomContext(roomNumber, true); // Get FULL history for synthesis
        const synthesisPrompt = transcriptContext
            ? `TOPIC: "${topic.text}"\n\nReview the complete discussion below and synthesize the key insights about the topic above into 2-3 concise bullet points. Focus on the most valuable takeaways that directly answer or address the topic. Use markdown formatting.\n\nCOMPLETE DISCUSSION:\n${fullConversation}\n\n${transcriptContext}`
            : `TOPIC: "${topic.text}"\n\nReview the complete discussion below and synthesize the key insights about the topic above into 2-3 concise bullet points. Focus on the most valuable takeaways that directly answer or address the topic. Use markdown formatting.\n\nCOMPLETE DISCUSSION:\n${fullConversation}`;

        const insights = await this.callOpenRouter(moderator,
            synthesisPrompt,
            '', // Don't pass context again, we already included it in the prompt
            500  // Higher token limit for room synthesis
        );

        // Add to whiteboard
        this.whiteboards[roomNumber].push({
            timestamp: new Date(),
            content: insights
        });

        this.renderWhiteboard(roomNumber);
        this.addLog(`Room ${roomNumber} discussion completed`, 'success');
    }

    addRoomMessage(roomNumber, sender, avatar, message, isModerator = false) {
        // Save to room conversation history
        this.roomConversations[roomNumber].push({
            sender: sender,
            avatar: avatar,
            message: message,
            isModerator: isModerator,
            timestamp: new Date()
        });

        // Render in UI
        const container = document.getElementById(`conversation-${roomNumber}`);

        if (container.querySelector('.placeholder')) {
            container.innerHTML = '';
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `conversation-message ${isModerator ? 'moderator' : ''}`;
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="bot-avatar">${avatar}</span>
                <span>${sender}</span>
            </div>
            <div class="message-content markdown-content">${marked.parse(message)}</div>
        `;

        container.appendChild(messageDiv);
        this.smoothScrollToBottom(container);
    }

    addMainRoomMessage(sender, avatar, message, isModerator = false) {
        const container = document.getElementById('main-conversation');

        if (container.querySelector('.placeholder')) {
            container.innerHTML = '';
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `conversation-message ${isModerator ? 'moderator' : ''}`;
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="bot-avatar">${avatar}</span>
                <span>${sender}</span>
            </div>
            <div class="message-content markdown-content">${marked.parse(message)}</div>
        `;

        container.appendChild(messageDiv);
        this.smoothScrollToBottom(container);
    }

    clearRoomConversation(roomNumber) {
        // Clear conversation array
        this.roomConversations[roomNumber] = [];

        // Clear UI
        const container = document.getElementById(`conversation-${roomNumber}`);
        container.innerHTML = '<p class="placeholder">Discussion will appear here...</p>';
    }

    clearMainConversation() {
        const container = document.getElementById('main-conversation');
        container.innerHTML = '<p class="placeholder">Debrief discussion will appear here when cycle starts...</p>';
    }

    getRoomContext(roomNumber, fullHistory = false) {
        const conversation = this.roomConversations[roomNumber] || [];

        if (conversation.length === 0) {
            return '';
        }

        if (fullHistory) {
            // Get ALL messages (moderator + all bots) for synthesis
            return conversation.map(msg =>
                `${msg.sender}: ${msg.message}`
            ).join('\n\n');
        } else {
            // Get recent messages for ongoing conversation (last 10 messages)
            const recentConversation = conversation.slice(-10);
            return recentConversation.map(msg =>
                `${msg.sender}: ${msg.message}`
            ).join('\n\n');
        }
    }

    async getTranscriptContext() {
        // Return transcript buffer from Observer Bot if available
        if (!this.state.transcriptBuffer || this.state.transcriptBuffer.length === 0) {
            return null;
        }

        const fullTranscript = this.state.transcriptBuffer.join(' ');

        // Check if we already have a cached summary for this transcript
        const transcriptHash = fullTranscript.length; // Simple hash - length as proxy
        if (this.state.cachedTranscriptSummary && this.state.cachedTranscriptHash === transcriptHash) {
            console.log('Using cached transcript summary');
            return this.state.cachedTranscriptSummary;
        }

        this.addLog('🤖 Generating meeting context summary from full transcript...', 'info');

        try {
            // Use Gemini to create a comprehensive summary of the full transcript
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.openRouterApiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'NoConference Context Generator'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                        {
                            role: 'user',
                            content: `Here is a transcript from a real meeting that was recorded:\n\n"${fullTranscript}"\n\nCreate a concise summary (200-300 words) that captures:\n1. Key topics and themes discussed\n2. Important points or insights mentioned\n3. Any questions or concerns raised\n4. Overall context and tone of the discussion\n\nThis summary will be provided to AI discussion bots as background context. Make it informative and useful for understanding what was discussed.`
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.3
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Gemini context generation error:', data);
                // Fallback to simple truncation if API fails
                const contextLength = 500;
                const trimmedTranscript = fullTranscript.length > contextLength
                    ? '...' + fullTranscript.slice(-contextLength)
                    : fullTranscript;
                return `Meeting transcript excerpt: "${trimmedTranscript}"`;
            }

            const summary = data.choices[0].message.content.trim();
            const contextText = `Meeting Context Summary:\n\n${summary}`;

            // Cache the summary
            this.state.cachedTranscriptSummary = contextText;
            this.state.cachedTranscriptHash = transcriptHash;

            this.addLog(`✓ Context summary generated (${summary.length} chars from ${fullTranscript.length} chars transcript)`, 'success');

            return contextText;

        } catch (error) {
            console.error('Error generating transcript context:', error);
            // Fallback to simple truncation
            const contextLength = 500;
            const trimmedTranscript = fullTranscript.length > contextLength
                ? '...' + fullTranscript.slice(-contextLength)
                : fullTranscript;
            return `Meeting transcript excerpt: "${trimmedTranscript}"`;
        }
    }

    async startDebriefPhase() {
        console.log('🎯 DEBRIEF PHASE STARTING');
        this.state.phase = 'debrief';
        this.state.timeRemaining = this.config.debriefTime * 60;

        document.getElementById('cycle-phase').textContent = 'Debrief';
        document.getElementById('cycle-phase').style.background = 'var(--success-color)';
        document.getElementById('main-room-status').textContent = 'Debrief session in progress';

        this.addLog('🎯 Starting debrief session in main room...', 'success');
        this.clearMainConversation();

        // Bots return to main room (but keep their message histories!)
        this.bots.forEach(bot => bot.currentRoom = 'main');
        this.renderBots();
        this.renderMainRoomParticipants();

        // Log context preservation
        const totalBotMessages = this.bots.reduce((sum, bot) => sum + bot.messageHistory.length, 0);
        const totalRoomMessages = Object.values(this.roomConversations).reduce((sum, conv) => sum + conv.length, 0);
        this.addLog(`✓ Bot context preserved: ${totalBotMessages} bot messages + ${totalRoomMessages} room messages available for debrief`, 'success');

        // Main moderator facilitates debrief
        const moderator = this.moderators.main;

        // Moderator opens the debrief
        const opening = await this.callOpenRouter(moderator,
            `Welcome everyone back to the main room. We've had discussions on 4 topics. I'd like to hear each participant share their key takeaway from their breakout discussion - please keep it brief (1-2 sentences). Let's go in order by room.`
        );
        this.addMainRoomMessage('Main Moderator', '👨‍💼', opening, true);

        // Track which bots have shared from which rooms
        const botsShared = new Set();

        // PHASE 1: Let all bots share their insights (go through each room systematically)
        this.addLog('Starting sharing phase - all bots will share insights...', 'info');

        for (let roomNum = 1; roomNum <= 4; roomNum++) {
            const topic = this.topics[roomNum];
            const insights = this.whiteboards[roomNum].map(w => w.content).join('\n');

            // Get all bots from this room
            const botsFromRoom = this.bots.filter(b =>
                b.messageHistory.some(m => m.room === roomNum)
            );

            if (botsFromRoom.length === 0) {
                continue; // No bots in this room
            }

            this.addLog(`Room ${roomNum}: ${botsFromRoom.length} bots sharing insights on "${topic.text}"`, 'info');
            document.getElementById('moderator-action').textContent = `Room ${roomNum} participants sharing...`;

            // All bots from this room share (no per-round limit, just go through them all)
            for (const bot of botsFromRoom) {
                // Check timer before each bot shares
                if (this.state.phase !== 'debrief' || this.state.timeRemaining <= 30) {
                    console.log('Timer running low, wrapping up sharing phase...');
                    break;
                }

                // Get bot's own messages from that room
                const botRoomMessages = bot.messageHistory
                    .filter(m => m.room === roomNum)
                    .map(m => `You said: "${m.content}"`)
                    .join('\n');

                // Also get the full room conversation for context
                const roomConversation = this.roomConversations[roomNum]
                    .map(msg => `${msg.sender}: ${msg.message}`)
                    .join('\n\n');

                const reflectionPrompt = `You participated in a discussion about: "${topic.text}"

YOUR CONTRIBUTIONS TO THE DISCUSSION:
${botRoomMessages}

FULL ROOM CONVERSATION:
${roomConversation}

KEY INSIGHTS SYNTHESIZED:
${insights}

Share your main takeaway from this discussion in 1-2 sentences. Be concise and specific about what you learned or contributed.`;

                const reflection = await this.callOpenRouter(bot, reflectionPrompt);

                this.addMainRoomMessage(bot.name, bot.avatar, reflection);
                this.addLog(`✓ ${bot.name} shared reflection from Room ${roomNum}`, 'success');

                // Mark this bot as having shared from this room
                botsShared.add(`${bot.id}-${roomNum}`);

                // Small delay between bot shares
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Stop if timer is low
            if (this.state.phase !== 'debrief' || this.state.timeRemaining <= 30) {
                break;
            }
        }

        this.addLog(`Sharing phase complete: ${botsShared.size} insights shared`, 'success');

        // PHASE 2: Discussion phase (if time allows - keep 60s for final synthesis)
        if (this.state.phase === 'debrief' && this.state.timeRemaining > 90) {
            this.addLog('Starting debrief discussion phase...', 'info');
            document.getElementById('moderator-action').textContent = 'Facilitating cross-room discussion...';

            // Moderator opens discussion
            const discussionOpening = await this.callOpenRouter(moderator,
                `Thank you all for sharing. Now let's discuss what we've heard. What connections or patterns do you notice across the different room discussions? What insights build on each other?`
            );
            this.addMainRoomMessage('Main Moderator', '👨‍💼', discussionOpening, true);

            // Discussion rounds - continue while time allows (reserve 60s for synthesis)
            let discussionRound = 0;
            const maxDiscussionRounds = 2; // Limit to 2 rounds for time efficiency

            while (this.state.phase === 'debrief' && this.state.timeRemaining > 60 && discussionRound < maxDiscussionRounds) {
                discussionRound++;
                console.log(`Debrief discussion round ${discussionRound} (${this.state.timeRemaining}s remaining)`);

                // Get recent debrief conversation for context
                const mainConversation = Array.from(document.getElementById('main-conversation').querySelectorAll('.conversation-message'))
                    .map(msg => {
                        const sender = msg.querySelector('.message-header span:nth-child(2)').textContent;
                        const content = msg.querySelector('.message-content').textContent;
                        return `${sender}: ${content}`;
                    })
                    .join('\n\n');

                // Select 2-3 random bots to contribute to discussion
                const shuffledBots = [...this.bots].sort(() => Math.random() - 0.5);
                const discussionBots = shuffledBots.slice(0, Math.min(3, shuffledBots.length));

                for (const bot of discussionBots) {
                    if (this.state.phase !== 'debrief' || this.state.timeRemaining <= 60) {
                        break;
                    }

                    const discussionPrompt = `You're in a debrief discussion. Here's what's been shared so far:

${mainConversation}

Respond briefly (1-2 sentences): What connections do you see between different perspectives? Or what questions does this raise for you?`;

                    const discussionResponse = await this.callOpenRouter(bot, discussionPrompt);
                    this.addMainRoomMessage(bot.name, bot.avatar, discussionResponse);
                    this.addLog(`✓ ${bot.name} contributed to discussion`, 'info');

                    // Small delay between bot responses
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Check if we should continue
                if (this.state.timeRemaining <= 60) {
                    break;
                }

                // Delay between discussion rounds
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            this.addLog('Debrief discussion completed', 'success');
        } else if (this.state.phase === 'debrief' && this.state.timeRemaining > 0) {
            this.addLog(`Skipping discussion phase - only ${this.state.timeRemaining}s remaining (need 90s+)`, 'warning');
        }

        // FINAL SYNTHESIS: Moderator synthesizes overall insights (final 60 seconds reserved for this)
        document.getElementById('moderator-action').textContent = 'Synthesizing session insights...';

        const allInsights = [1, 2, 3, 4]
            .map(num => `Room ${num} (${this.topics[num].text}):\n${this.whiteboards[num].map(w => w.content).join('\n')}`)
            .join('\n\n');

        const finalSynthesis = await this.callOpenRouter(moderator,
            `Based on all room discussions, synthesize the most important cross-cutting insights and themes in 3-4 bullet points.\n\n${allInsights}`,
            '',
            800  // Higher token limit for comprehensive synthesis
        );

        this.addMainRoomMessage('Main Moderator', '👨‍💼', finalSynthesis, true);

        this.whiteboards.main.push({
            timestamp: new Date(),
            content: finalSynthesis,
            type: 'synthesis'
        });

        this.renderWhiteboard('main');

        this.addLog('Debrief synthesis completed - waiting for timer...', 'success');

        // Wait for timer to naturally expire before ending cycle
        document.getElementById('moderator-action').textContent = 'Debrief complete - waiting for timer...';

        while (this.state.phase === 'debrief' && this.state.timeRemaining > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.addLog('Debrief timer expired - ending cycle', 'success');

        // End cycle
        await this.endCycle();
    }

    async endCycle() {
        this.stopTimer();

        // NOTE: Observer Bot continues running independently - don't stop it!

        // Export whiteboards
        await this.exportAllWhiteboards();

        // Clear whiteboards
        this.whiteboards = {
            main: [],
            1: [],
            2: [],
            3: [],
            4: []
        };

        // Clear room conversations
        this.roomConversations = {
            1: [],
            2: [],
            3: [],
            4: []
        };

        // Clear room assignments
        [1, 2, 3, 4].forEach(num => {
            this.topics[num] = null;
            document.getElementById(`topic-${num}`).textContent = 'No topic assigned';
            document.getElementById(`topic-${num}`).classList.remove('has-topic');
            document.getElementById(`participants-${num}`).innerHTML = '<p class="placeholder">Waiting for participants...</p>';
            document.getElementById(`conversation-${num}`).innerHTML = '<p class="placeholder">Discussion will appear here...</p>';
            document.getElementById(`whiteboard-${num}`).innerHTML = '<p class="placeholder">Key insights will appear here...</p>';
            document.querySelector(`[data-room="${num}"]`).classList.remove('active');
        });

        document.getElementById('main-conversation').innerHTML = '<p class="placeholder">Debrief discussion will appear here when cycle starts...</p>';
        document.getElementById('main-whiteboard').innerHTML = '<p class="placeholder">Insights from debrief sessions will appear here...</p>';

        // Reset bot message histories for rooms (keep their character)
        this.bots.forEach(bot => {
            bot.messageHistory = [];
            bot.currentRoom = 'main';
        });

        Object.values(this.moderators).forEach(mod => {
            mod.messageHistory = [];
        });

        this.state.phase = 'idle';
        document.getElementById('cycle-phase').textContent = 'Idle';
        document.getElementById('cycle-phase').style.background = 'var(--secondary-color)';
        document.getElementById('main-room-status').textContent = 'Waiting for cycle...';
        document.getElementById('moderator-action').textContent = 'Ready to facilitate';
        document.getElementById('start-cycle').disabled = false;
        document.getElementById('stop-cycle').disabled = true;

        this.renderBots();
        this.renderInbox();

        this.addLog('Cycle completed! Whiteboards exported and cleared.', 'success');

        // Check if auto-cycle is enabled
        const autoCycleEnabled = document.getElementById('auto-cycle').checked;
        const availableTopics = this.inbox.filter(t => !t.assigned);

        if (autoCycleEnabled) {
            if (availableTopics.length >= 4) {
                this.addLog(`🔄 Auto-cycle enabled: Found ${availableTopics.length} topics. Starting next cycle in 5 seconds...`, 'success');
            } else {
                this.addLog(`🔄 Auto-cycle enabled: Only ${availableTopics.length} topic${availableTopics.length !== 1 ? 's' : ''} available. Will start and wait for more...`, 'info');
            }

            // Show countdown
            let countdown = 5;
            const countdownInterval = setInterval(() => {
                countdown--;
                document.getElementById('cycle-phase').textContent = `Auto-start in ${countdown}s`;
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                }
            }, 1000);

            // Brief pause before starting next cycle (gives time to review whiteboards)
            setTimeout(() => {
                clearInterval(countdownInterval);
                // Double-check conditions before auto-starting (no topic count check - startCycle will wait)
                if (this.state.phase === 'idle' && document.getElementById('auto-cycle').checked) {
                    this.addLog('🔄 Auto-starting next conference cycle...', 'success');
                    this.startCycle();
                } else {
                    document.getElementById('cycle-phase').textContent = 'Idle';
                }
            }, 5000);
        } else {
            this.addLog('Cycle ended. Click "Start Cycle" or enable auto-cycle to continue.', 'info');
        }
    }

    async stopCycle() {
        if (confirm('Are you sure you want to stop the current cycle?')) {
            this.addLog('Cycle stopped by user', 'warning');

            // Disable auto-cycle when manually stopped
            document.getElementById('auto-cycle').checked = false;
            this.addLog('Auto-cycle disabled (manually stopped)', 'info');

            await this.endCycle();
        }
    }

    startTimer() {
        this.updateTimerDisplay();
        this.state.timerInterval = setInterval(() => {
            this.state.timeRemaining--;
            this.updateTimerDisplay();

            if (this.state.timeRemaining <= 0) {
                // Timer expired - phase should naturally transition
                // This is just a safeguard
                this.stopTimer();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
            this.state.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.state.timeRemaining / 60);
        const seconds = this.state.timeRemaining % 60;
        document.getElementById('timer').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    async callOpenRouter(bot, prompt, context = '', maxTokens = 300) {
        if (!this.config.openRouterApiKey) {
            console.error('No OpenRouter API key configured');
            return 'API key not configured';
        }

        const messages = [
            {
                role: 'system',
                content: `${bot.systemPrompt}\n\nIMPORTANT: Use markdown formatting in your responses. Use **bold** for emphasis, bullet lists (- or *) for organizing points, and keep responses clear and structured.`
            }
        ];

        if (context) {
            messages.push({
                role: 'user',
                content: `Context from discussion:\n${context}\n\n---\n\n${prompt}`
            });
        } else {
            messages.push({
                role: 'user',
                content: prompt
            });
        }

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.openRouterApiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'NoConference AI System'
                },
                body: JSON.stringify({
                    model: bot.model,
                    messages: messages,
                    max_tokens: maxTokens,
                    temperature: 0.7
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('OpenRouter error details:', data);
                throw new Error(`OpenRouter API error: ${response.status} - ${data.error?.message || JSON.stringify(data)}`);
            }

            return data.choices[0].message.content;

        } catch (error) {
            console.error('Error calling OpenRouter:', error);
            this.addLog(`Error calling AI (${bot.name}): ${error.message}`, 'warning');
            return `[Error: ${error.message}]`;
        }
    }

    renderWhiteboard(location) {
        const container = document.getElementById(
            location === 'main' ? 'main-whiteboard' : `whiteboard-${location}`
        );

        const entries = this.whiteboards[location];

        if (entries.length === 0) {
            container.innerHTML = '<p class="placeholder">Discussion insights will appear here...</p>';
            return;
        }

        container.innerHTML = entries.map(entry => `
            <div class="${location === 'main' ? 'whiteboard-entry' : 'mini-whiteboard-entry'}">
                <div class="timestamp">${entry.timestamp.toLocaleTimeString()}</div>
                <div class="markdown-content">${marked.parse(entry.content)}</div>
            </div>
        `).join('');

        // Smooth scroll to bottom after rendering
        this.smoothScrollToBottom(container);
    }

    smoothScrollToBottom(element) {
        // Double requestAnimationFrame ensures DOM has fully updated and rendered
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // Check if user has scrolled up (more than 100px from bottom)
                const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;

                // Only auto-scroll if user is near the bottom
                if (isNearBottom || element.scrollTop === 0) {
                    element.scrollTo({
                        top: element.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    async exportWhiteboard(location) {
        const entries = this.whiteboards[location];

        if (entries.length === 0) {
            alert('Whiteboard is empty!');
            return;
        }

        const content = entries.map(entry =>
            `[${entry.timestamp.toLocaleString()}]\n${entry.content}\n`
        ).join('\n---\n\n');

        const filename = `whiteboard-${location}-${Date.now()}.txt`;

        this.downloadTextFile(filename, content);
        this.addLog(`Exported ${location} whiteboard to ${filename}`, 'success');
    }

    async exportAllWhiteboards() {
        const allContent = [];

        allContent.push('=== NoConference Session Export ===');
        allContent.push(`Date: ${new Date().toLocaleString()}\n`);

        // Main whiteboard
        if (this.whiteboards.main.length > 0) {
            allContent.push('=== MAIN ROOM - DEBRIEF INSIGHTS ===\n');
            this.whiteboards.main.forEach(entry => {
                allContent.push(`[${entry.timestamp.toLocaleTimeString()}]`);
                allContent.push(entry.content);
                allContent.push('');
            });
        }

        // Room whiteboards
        for (let i = 1; i <= 4; i++) {
            if (this.whiteboards[i].length > 0 && this.topics[i]) {
                allContent.push(`\n=== ROOM ${i}: ${this.topics[i].text} ===\n`);
                this.whiteboards[i].forEach(entry => {
                    allContent.push(`[${entry.timestamp.toLocaleTimeString()}]`);
                    allContent.push(entry.content);
                    allContent.push('');
                });
            }
        }

        const filename = `noconference-session-${Date.now()}.txt`;
        this.downloadTextFile(filename, allContent.join('\n'));
        this.addLog(`Exported complete session to ${filename}`, 'success');
    }

    downloadTextFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    async toggleObserver() {
        if (!this.state.observerActive) {
            await this.startObserver();
        } else {
            this.stopObserver();
        }
    }

    showTranscriptTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.transcript-tab').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');

        // Show/hide content
        document.getElementById('transcript-full').style.display = tab === 'full' ? 'block' : 'none';
        document.getElementById('transcript-context').style.display = tab === 'context' ? 'block' : 'none';
    }

    updateTranscriptDisplay() {
        // Show the transcript section if we have transcripts
        if (this.state.transcriptBuffer && this.state.transcriptBuffer.length > 0) {
            document.getElementById('transcript-section').style.display = 'block';
        }

        // Update full transcript view
        const fullContainer = document.getElementById('transcript-full');
        if (!this.state.transcriptBuffer || this.state.transcriptBuffer.length === 0) {
            const statusMsg = this.state.observerActive
                ? '<p style="color: var(--success-color); font-style: italic; font-size: 12px;">🟢 Observer Bot listening... Transcripts will appear here.</p>'
                : '<p style="color: var(--text-secondary); font-style: italic; font-size: 12px;">No transcripts yet. Start the Observer Bot to record.</p>';
            fullContainer.innerHTML = statusMsg;
        } else {
            // Build status indicators
            let statusIndicators = '';

            // Active recording indicator
            if (this.state.observerActive) {
                statusIndicators += '<div style="padding: 8px; background: rgba(34, 197, 94, 0.1); border-radius: 4px; margin-bottom: 8px; font-size: 11px; color: var(--success-color);">🟢 Continuous recording active - zero gaps!</div>';
            }

            // Queue status indicator
            const queueSize = this.state.audioQueue ? this.state.audioQueue.length : 0;
            if (queueSize > 0 || this.state.isProcessingQueue) {
                const queueStatus = this.state.isProcessingQueue ? '⚙️ Processing' : '📼 Queued';
                statusIndicators += `<div style="padding: 8px; background: rgba(59, 130, 246, 0.1); border-radius: 4px; margin-bottom: 10px; font-size: 11px; color: #3b82f6;">${queueStatus}: ${queueSize} audio chunks waiting for transcription</div>`;
            }

            fullContainer.innerHTML = statusIndicators + this.state.transcriptBuffer.map((segment, index) => `
                <div class="transcript-segment">
                    <div class="timestamp">Segment ${index + 1}</div>
                    <div class="text">${segment}</div>
                </div>
            `).join('');

            // Auto-scroll to bottom
            this.smoothScrollToBottom(fullContainer);
        }

        // Update context view (what bots actually see)
        const contextContainer = document.getElementById('transcript-context');

        // Check if we have a cached summary, otherwise show placeholder and generate async
        const fullTranscriptForHash = this.state.transcriptBuffer ? this.state.transcriptBuffer.join(' ') : '';
        const currentHash = fullTranscriptForHash.length;

        if (!fullTranscriptForHash) {
            contextContainer.innerHTML = '<p style="color: var(--text-secondary); font-style: italic; font-size: 12px;">Context will appear here when transcripts are available.</p>';
        } else if (this.state.cachedTranscriptSummary && this.state.cachedTranscriptHash === currentHash) {
            // Use cached summary
            const transcriptContext = this.state.cachedTranscriptSummary;
            const fullTranscript = this.state.transcriptBuffer.join(' ');
            const activeNote = this.state.observerActive
                ? '<div style="padding: 6px; background: rgba(34, 197, 94, 0.1); border-radius: 4px; margin-bottom: 8px; font-size: 10px; color: var(--success-color);">💡 Observer Bot runs continuously - even during conference cycles! New transcripts are added in real-time.</div>'
                : '';

            // Show what context bots receive
            const contextUsage = `
                <div style="padding: 8px; background: rgba(139, 92, 246, 0.1); border-radius: 4px; margin-bottom: 10px; font-size: 11px; color: #8b5cf6; line-height: 1.5;">
                    <strong>✓ This context is passed to ALL bots and moderators</strong>
                    <br>• Moderator opening questions
                    <br>• All bot responses (initial and follow-up)
                    <br>• Moderator follow-up questions
                    <br>• Final insights synthesis
                    <br><br>Bots receive BOTH:
                    <br>1. This transcript context (real meeting background)
                    <br>2. Room conversation (what's been discussed in their room)
                </div>
            `;

            contextContainer.innerHTML = `
                ${activeNote}
                <div class="context-info">
                    📊 Context Summary Statistics
                    <br>Total transcript: ${fullTranscript.length} characters
                    <br>Context used: AI-generated summary (${transcriptContext.length} chars)
                    <br>Segments: ${this.state.transcriptBuffer.length}
                </div>
                ${contextUsage}
                <div class="context-display">${transcriptContext}</div>
            `;
        } else {
            // No cached summary yet - show placeholder and generate async
            const fullTranscript = this.state.transcriptBuffer.join(' ');
            contextContainer.innerHTML = `
                <div style="padding: 12px; background: rgba(139, 92, 246, 0.1); border-radius: 8px; text-align: center;">
                    <div style="color: #8b5cf6; font-size: 14px; margin-bottom: 8px;">🤖 Generating AI context summary...</div>
                    <div style="color: var(--text-secondary); font-size: 11px;">Processing ${fullTranscript.length} characters from ${this.state.transcriptBuffer.length} transcript segments</div>
                </div>
            `;

            // Generate summary async and update display when ready
            this.getTranscriptContext().then(() => {
                // Summary is now cached, update the display
                this.updateTranscriptDisplay();
            }).catch(err => {
                console.error('Error generating context:', err);
                contextContainer.innerHTML = `
                    <div style="padding: 12px; background: rgba(220, 38, 38, 0.1); border-radius: 8px; text-align: center; color: var(--danger-color);">
                        ⚠️ Error generating context summary. Will use fallback during cycle.
                    </div>
                `;
            });
        }
    }

    clearTranscriptHistory() {
        if (confirm('Clear all transcript history? This will reset the conversation context.')) {
            this.state.transcriptBuffer = [];
            this.state.lastAnalyzedLength = 0;
            this.state.cachedTranscriptSummary = null;
            this.state.cachedTranscriptHash = null;
            this.state.observerMessageHistory = [];
            this.addLog('Transcript history and context summary cleared', 'success');

            // Update display and hide section if empty
            this.updateTranscriptDisplay();
            if (!this.state.transcriptBuffer || this.state.transcriptBuffer.length === 0) {
                document.getElementById('transcript-section').style.display = 'none';
            }
        }
    }

    toggleKioskMode() {
        if (this.state.kioskMode) {
            this.exitKioskMode();
        } else {
            this.enterKioskMode();
        }
    }

    async enterKioskMode() {
        try {
            // Request fullscreen
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }

            // Set kiosk mode state
            this.state.kioskMode = true;

            // Update button
            const btn = document.getElementById('kiosk-mode');
            btn.textContent = '🚪 Exit Fullscreen';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-danger');

            // Add kiosk indicator (for styling only, keep all UI visible)
            document.body.classList.add('kiosk-mode');

            this.addLog('🖥️ Fullscreen mode activated - Press ESC to exit', 'success');

        } catch (error) {
            console.error('Error entering kiosk mode:', error);
            this.addLog('Could not enter fullscreen mode: ' + error.message, 'warning');
        }
    }

    exitKioskMode() {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        // Reset state
        this.state.kioskMode = false;

        // Update button
        const btn = document.getElementById('kiosk-mode');
        btn.textContent = '🖥️ Fullscreen Mode';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-secondary');

        // Remove kiosk indicator
        document.body.classList.remove('kiosk-mode');

        this.addLog('Fullscreen mode exited', 'info');
    }

    async loadMicrophones() {
        try {
            // Request permission first
            await navigator.mediaDevices.getUserMedia({ audio: true });

            // Get list of all audio input devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');

            const select = document.getElementById('microphone-select');
            select.innerHTML = '<option value="">Default Microphone</option>';

            audioInputs.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Microphone ${select.options.length}`;
                select.appendChild(option);
            });

            this.addLog(`Found ${audioInputs.length} microphone(s)`, 'info');
        } catch (error) {
            console.error('Could not load microphones:', error);
            this.addLog('Could not load microphones: ' + error.message, 'warning');
        }
    }

    testMicrophone() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Din webbläsare stödjer inte speech recognition. Prova Chrome eller Edge.');
            return;
        }

        this.addLog('Testar mikrofon... Säg något på svenska!', 'info');

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const testRecognition = new SpeechRecognition();

        testRecognition.lang = 'sv-SE';
        testRecognition.continuous = false;
        testRecognition.interimResults = true;

        testRecognition.onstart = () => {
            this.addLog('🎤 Mikrofon aktiv - PRATA NU!', 'success');
        };

        testRecognition.onresult = (event) => {
            const last = event.results.length - 1;
            const transcript = event.results[last][0].transcript;
            const confidence = event.results[last][0].confidence;

            if (event.results[last].isFinal) {
                this.addLog(`✓ TEST LYCKADES! Du sa: "${transcript}" (säkerhet: ${(confidence * 100).toFixed(0)}%)`, 'success');
            } else {
                console.log('Interim test result:', transcript);
            }
        };

        testRecognition.onerror = (event) => {
            if (event.error === 'no-speech') {
                this.addLog('❌ Ingen röst hördes. Kontrollera mikrofonen och prata högre!', 'warning');
            } else {
                this.addLog(`❌ Mikrofon-fel: ${event.error}`, 'warning');
            }
        };

        testRecognition.onend = () => {
            this.addLog('Mikrofontest avslutat.', 'info');
        };

        testRecognition.start();

        // Auto-stop after 5 seconds
        setTimeout(() => {
            if (testRecognition) {
                testRecognition.stop();
            }
        }, 5000);
    }

    async startObserver() {
        try {
            // Check if OpenAI API key is configured
            const openaiKey = localStorage.getItem('openai_api_key');
            if (!openaiKey) {
                alert('Observer Bot requires an OpenAI API key for Whisper transcription.\n\nPlease set it via:\nlocalStorage.setItem("openai_api_key", "your-key")\n\nThen reload the page or try again.');
                this.addLog('⚠️ Cannot start Observer Bot: OpenAI API key not configured', 'warning');
                return;
            }

            this.addLog('Observer bot: Initializing 30-second recording segments with queue processing...', 'info');

            // Get selected microphone
            const micSelect = document.getElementById('microphone-select');
            const selectedMicId = micSelect.value;

            // Start recording audio with selected microphone
            const constraints = {
                audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true
            };
            this.state.audioStream = await navigator.mediaDevices.getUserMedia(constraints);

            if (selectedMicId) {
                const selectedOption = micSelect.options[micSelect.selectedIndex];
                this.addLog(`Using microphone: ${selectedOption.textContent}`, 'info');
            }

            // Initialize state
            this.state.audioQueue = [];
            this.state.transcriptBuffer = this.state.transcriptBuffer || [];
            this.state.lastAnalyzedLength = 0;
            this.state.currentChunks = [];
            this.state.observerMessageHistory = this.state.observerMessageHistory || [];

            // Function to start a new recording segment
            const startRecordingSegment = () => {
                if (!this.state.observerActive) return;

                // Create new MediaRecorder for this segment
                const recorder = new MediaRecorder(this.state.audioStream);
                this.state.mediaRecorder = recorder;
                this.state.currentChunks = [];

                // Collect chunks from this recording
                recorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        console.log(`Audio chunk received: ${event.data.size} bytes, type: ${event.data.type}`);
                        this.state.currentChunks.push(event.data);
                    }
                };

                // When recording stops, queue the chunks and start a new recording
                recorder.onstop = () => {
                    if (this.state.currentChunks.length > 0) {
                        // Queue the chunks for processing
                        const timestamp = new Date();
                        this.state.audioQueue.push({
                            chunks: [...this.state.currentChunks],
                            timestamp: timestamp
                        });

                        this.addLog(`📼 Audio segment queued (queue size: ${this.state.audioQueue.length})`, 'info');

                        // Update display to show queue status
                        this.updateTranscriptDisplay();

                        // Start processing queue if not already processing
                        if (!this.state.isProcessingQueue) {
                            this.processAudioQueue();
                        }
                    }

                    // Immediately start next recording segment (minimal gap)
                    if (this.state.observerActive) {
                        startRecordingSegment();
                    }
                };

                // Start recording (will stop after 30 seconds)
                recorder.start();
                console.log('Started new 30-second recording segment');

                // Stop after 30 seconds to create complete webm file
                setTimeout(() => {
                    if (recorder.state === 'recording') {
                        recorder.stop();
                    }
                }, 30000);
            };

            // Set observer active before starting recordings (needed for guard clause)
            this.state.observerActive = true;
            document.getElementById('observer-status').textContent = '🟢';

            // Start the first recording segment
            startRecordingSegment();

            this.addLog('✓ Observer bot activated - 30-second recording segments started!', 'success');
            this.addLog('💡 Segments auto-restart with minimal gaps. Processing happens asynchronously.', 'info');

            // Show transcript section
            document.getElementById('transcript-section').style.display = 'block';
            this.updateTranscriptDisplay();

            // Start audio visualizer
            console.log('Starting audio visualizer...');
            this.startAudioVisualizer();
            console.log('Audio visualizer initialization complete');

        } catch (error) {
            alert('Could not access microphone: ' + error.message);
            this.addLog('Observer bot failed to start: ' + error.message, 'warning');
        }
    }

    async processAudioQueue() {
        if (this.state.isProcessingQueue) {
            return; // Already processing
        }

        this.state.isProcessingQueue = true;
        this.updateTranscriptDisplay(); // Show processing indicator

        while (this.state.audioQueue.length > 0) {
            const queueItem = this.state.audioQueue.shift(); // Take first item from queue
            this.addLog(`⚙️ Processing audio chunk (${this.state.audioQueue.length} remaining in queue)`, 'info');
            this.updateTranscriptDisplay(); // Update queue count

            try {
                await this.processAudioWithWhisper(queueItem.chunks);
            } catch (error) {
                console.error('Error processing audio from queue:', error);
                this.addLog(`⚠️ Error processing audio chunk: ${error.message}`, 'warning');
            }

            // Small delay between processing to avoid rate limits
            if (this.state.audioQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        this.state.isProcessingQueue = false;
        this.updateTranscriptDisplay(); // Remove processing indicator
        this.addLog('✓ Audio queue processing complete', 'info');
    }


    async processAudioWithWhisper(audioChunks) {
        try {
            if (!audioChunks || audioChunks.length === 0) {
                return;
            }

            // Create audio blob from provided chunks
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const blobSize = audioBlob.size;

            // Save audio file for debugging (if enabled)
            const saveDebugAudio = document.getElementById('save-audio-debug')?.checked;
            if (saveDebugAudio) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                const url = URL.createObjectURL(audioBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `whisper-audio-${timestamp}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log(`💾 Saved audio file: whisper-audio-${timestamp}.webm (${blobSize} bytes)`);
                this.addLog(`💾 Saved audio debug file (${(blobSize / 1024).toFixed(1)} KB)`, 'info');
            }

            // Skip if blob is too small (incomplete recording)
            if (blobSize < 1000) {
                console.log(`Blob too small (${blobSize} bytes), skipping...`);
                return;
            }

            // Check recent audio level to avoid Whisper hallucinations on silence
            // Use the visualizer's recent average level instead of trying to decode chunks
            // (webm chunks after the first don't have headers and can't be decoded standalone)
            const recentAudioLevel = this.state.recentAudioLevel || 0;
            const minAudioLevel = 5; // Minimum percentage from visualizer (0-100 scale)

            if (recentAudioLevel < minAudioLevel) {
                console.log(`Audio too quiet (${recentAudioLevel.toFixed(1)}%), skipping to prevent Whisper hallucinations...`);

                // Show warning every 5 minutes if audio is consistently too quiet
                if (!this.state.lastQuietWarning || Date.now() - this.state.lastQuietWarning > 300000) {
                    this.addLog(`⚠️ Audio too quiet (${recentAudioLevel.toFixed(1)}%). Speak louder or move closer to microphone.`, 'warning');
                    this.state.lastQuietWarning = Date.now();
                }
                return;
            }

            console.log(`Processing audio chunk: ${(blobSize / 1024).toFixed(1)} KB, recent level: ${recentAudioLevel.toFixed(1)}%`);

            // Call OpenAI Whisper API with the ORIGINAL blob (not corrupted)
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('model', 'whisper-1');
            formData.append('language', 'sv'); // Swedish
            formData.append('response_format', 'text');

            // Get OpenAI API key (should have been set at startup)
            const openaiKey = localStorage.getItem('openai_api_key');
            if (!openaiKey) {
                this.addLog('⚠️ OpenAI API key not configured. Add it via: localStorage.setItem("openai_api_key", "your-key")', 'warning');
                this.addLog('Then reload the page or restart the Observer Bot.', 'info');
                return;
            }

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI Whisper API error: ${response.status} - ${errorText}`);
            }

            const transcript = await response.text();
            const result = { text: transcript };

            if (result && result.text && result.text.trim().length > 0) {
                let transcript = result.text.trim();

                // Basic validation - OpenAI Whisper is much more reliable
                if (transcript.length < 5) {
                    console.log('Transcript too short, skipping...');
                    return;
                }

                this.state.transcriptBuffer.push(transcript);
                const bufferMinutes = this.state.transcriptBuffer.length;

                // Show current phase in log
                const phaseInfo = this.state.phase !== 'idle' ? ` [during ${this.state.phase}]` : '';
                this.addLog(`✓ Whisper heard: "${transcript}" (${bufferMinutes} segments buffered)${phaseInfo}`, 'success');

                // Update transcript display
                this.updateTranscriptDisplay();

                // Process with Gemini when we have enough NEW transcript AND need more topics
                const fullTranscript = this.state.transcriptBuffer.join(' ');
                const newContentLength = fullTranscript.length - (this.state.lastAnalyzedLength || 0);
                const hasEnoughNewText = newContentLength > 100; // Need 100+ new characters
                const availableTopics = this.inbox.filter(t => !t.assigned).length;
                const needsMoreTopics = availableTopics < 8; // Only extract when we have less than 8 available topics

                if (hasEnoughNewText && needsMoreTopics) {
                    this.addLog(`📊 Topic extraction triggered (${availableTopics} topics available, ${newContentLength} new chars)`, 'info');
                    await this.processTranscriptWithGemini();
                } else if (hasEnoughNewText && !needsMoreTopics) {
                    console.log(`Skipping topic extraction: ${availableTopics} topics already available (threshold: 8)`);
                }
            } else {
                console.log('No speech detected in this segment');
            }

        } catch (error) {
            console.error('Error processing audio with Whisper:', error);
            this.addLog(`Whisper error: ${error.message}`, 'warning');
        }
    }

    // Helper function to check if two topics are similar
    areTopicsSimilar(topic1, topic2) {
        const normalize = (str) => str.toLowerCase()
            .replace(/[?.!,]/g, '')
            .trim();

        const t1 = normalize(topic1);
        const t2 = normalize(topic2);

        // Exact match after normalization
        if (t1 === t2) return true;

        // Check if one is contained in the other (substring match)
        if (t1.includes(t2) || t2.includes(t1)) return true;

        // Calculate word overlap
        const words1 = new Set(t1.split(/\s+/).filter(w => w.length > 3));
        const words2 = new Set(t2.split(/\s+/).filter(w => w.length > 3));

        if (words1.size === 0 || words2.size === 0) return false;

        const overlap = [...words1].filter(w => words2.has(w)).length;
        const similarity = overlap / Math.min(words1.size, words2.size);

        // If 60%+ of words overlap, consider them similar
        return similarity > 0.6;
    }

    async processTranscriptWithGemini() {
        try {
            const fullTranscript = this.state.transcriptBuffer.join(' ');

            if (fullTranscript.length < 20) {
                this.addLog('Observer bot: Not enough transcript to analyze yet', 'info');
                return;
            }

            // Extract only the NEW portion since last analysis
            const lastAnalyzed = this.state.lastAnalyzedLength || 0;
            const newContent = fullTranscript.substring(lastAnalyzed);

            if (newContent.length < 50) {
                console.log(`Not enough new content to analyze (${newContent.length} chars)`);
                return;
            }

            this.addLog(`Observer bot: Analyzing ${newContent.length} characters of new transcript...`, 'info');

            // Get existing topics to avoid duplicates
            const existingTopics = this.inbox.map(t => t.text);
            const existingTopicsText = existingTopics.length > 0
                ? `\n\nEXISTING TOPICS (do not create duplicates or similar variations):\n${existingTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
                : '';

            // Initialize message history if this is the first call
            if (this.state.observerMessageHistory.length === 0) {
                this.state.observerMessageHistory.push({
                    role: 'system',
                    content: `You are an AI assistant analyzing meeting transcripts in real-time. Your job is to extract discussion topics and questions as they emerge. Extract 1-3 NEW and DISTINCT topics from each new segment. Each topic should be:
- Unique and different from previously extracted topics
- A clear, specific question or statement
- Not a variation or rephrasing of something already covered
- Substantial enough to warrant discussion

Return ONLY valid JSON: {"topics": ["Topic 1...", "Topic 2...", "Topic 3..."]}
If no new topics are found, return: {"topics": []}`
                });
            }

            // Add the new segment as a user message
            this.state.observerMessageHistory.push({
                role: 'user',
                content: `NEW TRANSCRIPT SEGMENT:\n\n"${newContent}"${existingTopicsText}\n\nExtract topics from this NEW segment only (do not re-analyze previous segments).`
            });

            // Use Gemini 2.5 Flash to extract topics from NEW transcript segment
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.openRouterApiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'NoConference Observer Bot'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: this.state.observerMessageHistory,
                    max_tokens: 300,
                    temperature: 0.5,
                    response_format: { type: 'json_object' }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Gemini error:', data);
                this.addLog(`Observer bot error: ${data.error?.message || 'Unknown error'}`, 'warning');
                return;
            }

            const responseContent = data.choices[0].message.content;

            // Add Gemini's response to message history
            this.state.observerMessageHistory.push({
                role: 'assistant',
                content: responseContent
            });

            // Trim message history to prevent it from growing too large
            // Keep system message + last 10 exchanges (20 messages)
            if (this.state.observerMessageHistory.length > 21) {
                const systemMsg = this.state.observerMessageHistory[0];
                const recentMessages = this.state.observerMessageHistory.slice(-20);
                this.state.observerMessageHistory = [systemMsg, ...recentMessages];
                console.log('Trimmed observer message history to last 10 exchanges');
            }

            // Update lastAnalyzedLength to mark this content as processed
            this.state.lastAnalyzedLength = fullTranscript.length;

            try {
                // Parse JSON response from Gemini
                const parsedResponse = JSON.parse(responseContent);
                const topics = parsedResponse.topics || [];

                if (topics.length > 0) {
                    const phaseInfo = this.state.phase !== 'idle' ? ` [during ${this.state.phase}]` : '';
                    let addedCount = 0;

                    topics.forEach(topicText => {
                        const cleanTopic = topicText.trim();

                        if (cleanTopic.length < 10) return; // Skip short topics

                        // Check if this topic is similar to any existing topic
                        const isDuplicate = existingTopics.some(existing =>
                            this.areTopicsSimilar(cleanTopic, existing)
                        );

                        if (!isDuplicate) {
                            this.inbox.push({
                                id: Date.now() + Math.random(),
                                text: cleanTopic,
                                timestamp: new Date(),
                                assigned: false,
                                source: 'observer'
                            });

                            this.addLog(`🎤 Observer added: "${cleanTopic.substring(0, 50)}${cleanTopic.length > 50 ? '...' : ''}${phaseInfo}"`, 'success');
                            addedCount++;
                        } else {
                            console.log(`Skipped duplicate topic: "${cleanTopic}"`);
                        }
                    });

                    if (addedCount > 0) {
                        this.renderInbox();
                    } else if (topics.length > 0) {
                        this.addLog('Observer bot: All extracted topics were duplicates, skipped', 'info');
                    }
                } else {
                    this.addLog('Observer bot: No new topics detected in this segment', 'info');
                }
            } catch (parseError) {
                console.error('Failed to parse Gemini JSON response:', parseError);
                console.log('Raw response:', responseContent);
                this.addLog(`Observer bot: Could not parse topics (${parseError.message})`, 'warning');
            }

            // Keep transcript history but limit to last 30 segments (roughly 30 minutes)
            if (this.state.transcriptBuffer.length > 30) {
                this.state.transcriptBuffer = this.state.transcriptBuffer.slice(-30);
                // Update analyzed length to match the trimmed buffer (all remaining content has been analyzed)
                this.state.lastAnalyzedLength = this.state.transcriptBuffer.join(' ').length;
                console.log('Trimmed transcript buffer to last 30 segments');
            }

        } catch (error) {
            console.error('Error processing transcript with Gemini:', error);
            this.addLog(`Observer bot error: ${error.message}`, 'warning');
        }
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    startAudioVisualizer() {
        try {
            // Show visualizer
            const visualizer = document.getElementById('audio-visualizer');
            if (!visualizer) {
                console.error('Visualizer element not found');
                return;
            }
            visualizer.style.display = 'block';
            console.log('Visualizer displayed');

            // Create audio context and analyzer
            this.state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.state.audioAnalyser = this.state.audioContext.createAnalyser();
            this.state.audioAnalyser.fftSize = 256;
            this.state.audioAnalyser.smoothingTimeConstant = 0.8;

            // Connect audio stream to analyzer
            const source = this.state.audioContext.createMediaStreamSource(this.state.audioStream);
            source.connect(this.state.audioAnalyser);

            console.log('Audio analyzer connected');

            // Start visualizer update loop
            const updateVisualizer = () => {
                if (!this.state.observerActive) {
                    return;
                }

                const dataArray = new Uint8Array(this.state.audioAnalyser.frequencyBinCount);
                this.state.audioAnalyser.getByteFrequencyData(dataArray);

                // Calculate average audio level
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                const normalizedLevel = Math.min(100, (average / 255) * 100);

                // Store recent audio level for silence detection (used by Whisper processing)
                this.state.recentAudioLevel = normalizedLevel;

                // Update level text
                const levelText = document.getElementById('audio-level-text');
                if (levelText) {
                    levelText.textContent = `${Math.round(normalizedLevel)}%`;
                }

                // Update 8 bars with different frequency ranges
                const barCount = 8;
                const barWidth = Math.floor(dataArray.length / barCount);

                for (let i = 0; i < barCount; i++) {
                    const start = i * barWidth;
                    const end = start + barWidth;
                    const sliceAverage = dataArray.slice(start, end).reduce((a, b) => a + b, 0) / barWidth;
                    const barHeight = Math.max(5, Math.min(100, (sliceAverage / 255) * 100));

                    const bar = document.getElementById(`bar${i + 1}`);
                    if (bar) {
                        bar.style.height = `${barHeight}%`;
                        if (barHeight > 20) {
                            bar.classList.add('active');
                        } else {
                            bar.classList.remove('active');
                        }
                    }
                }

                requestAnimationFrame(updateVisualizer);
            };

            updateVisualizer();
            this.addLog('✓ Audio visualizer started', 'success');
        } catch (error) {
            console.error('Error starting visualizer:', error);
            this.addLog('⚠️ Could not start audio visualizer: ' + error.message, 'warning');
        }
    }

    stopAudioVisualizer() {
        // Hide visualizer
        document.getElementById('audio-visualizer').style.display = 'none';

        // Close audio context
        if (this.state.audioContext) {
            this.state.audioContext.close();
            this.state.audioContext = null;
            this.state.audioAnalyser = null;
        }

        // Reset audio level tracking
        this.state.recentAudioLevel = 0;

        // Reset bars
        for (let i = 1; i <= 8; i++) {
            const bar = document.getElementById(`bar${i}`);
            if (bar) {
                bar.style.height = '5%';
                bar.classList.remove('active');
            }
        }
    }

    async stopObserver() {
        this.state.observerActive = false;

        // Stop visualizer
        this.stopAudioVisualizer();

        // Stop recording (this will trigger onstop, but it won't restart due to observerActive = false)
        if (this.state.mediaRecorder && this.state.mediaRecorder.state === 'recording') {
            this.state.mediaRecorder.stop();
        }

        // Stop audio stream
        if (this.state.audioStream) {
            this.state.audioStream.getTracks().forEach(track => track.stop());
        }

        // Queue any remaining chunks
        if (this.state.currentChunks && this.state.currentChunks.length > 0) {
            this.state.audioQueue.push({
                chunks: [...this.state.currentChunks],
                timestamp: new Date()
            });
            this.state.currentChunks = [];
            this.addLog(`📼 Final audio chunk queued (queue size: ${this.state.audioQueue.length})`, 'info');
        }

        document.getElementById('observer-status').textContent = '🔴';
        this.addLog('Observer bot deactivated - processing remaining queue...', 'info');

        // Process remaining queue
        if (this.state.audioQueue.length > 0) {
            this.addLog(`Processing ${this.state.audioQueue.length} remaining audio chunks...`, 'info');
            await this.processAudioQueue();
        }

        // Process any remaining transcript for topic extraction
        if (this.state.transcriptBuffer && this.state.transcriptBuffer.length > 0) {
            await this.processTranscriptWithGemini();
        }

        this.addLog('✓ Observer bot stopped. All queued audio processed.', 'success');

        // Update transcript display to show it's no longer active
        this.updateTranscriptDisplay();
    }

    addLog(message, type = 'info') {
        const container = document.getElementById('activity-log');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;

        const timestamp = new Date().toLocaleTimeString();
        entry.innerHTML = `<span class="timestamp">${timestamp}</span>${message}`;

        container.insertBefore(entry, container.firstChild);

        // Keep only last 50 entries
        while (container.children.length > 50) {
            container.removeChild(container.lastChild);
        }

        console.log(`[${timestamp}] ${message}`);
    }
}

// Initialize the system
let noConference;
document.addEventListener('DOMContentLoaded', () => {
    noConference = new NoConferenceSystem();
});
