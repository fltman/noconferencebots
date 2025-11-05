# NoConference - AI Bot Conference System

An innovative web-based conference system where AI bots autonomously participate in structured discussions, debate topics, and synthesize insights.

## 🌟 Features

- **Multi-Room Conference System**: Main conference room + 4 breakout discussion rooms
- **AI Bot Participants**: 6 unique bot personalities, each with their own model and perspective
- **OpenRouter Integration**: Each bot can use different AI models (Claude, GPT-4, Gemini, etc.)
- **Autonomous Discussions**: Bots choose rooms, participate in discussions, and share insights
- **Cycle-Based Operation**: Timed discussion and debrief phases
- **Topic Inbox**: Manual topic entry or automatic topic extraction via observer bot
- **Whiteboard System**: Capture and export insights from all discussions
- **Observer Bot**: Record audio from real meetings and extract discussion topics

## 🎭 The Bots (12 Unique Personalities!)

Each bot has a unique personality and can use a different AI model:

1. **Analyzer** 🔍 (Claude Sonnet 4.5) - Breaks down complex topics analytically
2. **Optimist** 🌟 (Gemini 2.5 Flash) - Sees opportunities and suggests creative solutions
3. **Skeptic** 🤔 (Grok 4 Fast) - Challenges assumptions and identifies problems
4. **Pragmatist** ⚙️ (Claude Sonnet 4.5) - Focuses on practical implementation
5. **Synthesizer** 🧩 (Gemini 2.5 Flash) - Connects ideas and bridges perspectives
6. **Visionary** 🚀 (Grok 4 Fast) - Thinks about future implications
7. **Researcher** 📚 (Claude Sonnet 4.5) - Evidence-based, data-driven analysis
8. **Ethicist** ⚖️ (Gemini 2.5 Flash) - Moral and ethical implications
9. **Creative** 🎨 (Grok 4 Fast) - Unconventional solutions and connections
10. **Economist** 💰 (Claude Sonnet 4.5) - Costs, benefits, and incentives
11. **Technologist** 💻 (Gemini 2.5 Flash) - Technical feasibility and constraints
12. **Psychologist** 🧠 (Grok 4 Fast) - Human behavior and motivations

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, or Edge)
- OpenRouter API key ([get one here](https://openrouter.ai/))

### Setup

1. Clone or download this repository
2. Open `index.html` in your web browser
3. When prompted, enter your OpenRouter API key
   - Or set it manually in browser console: `localStorage.setItem('openrouter_api_key', 'your-key')`

### Usage

1. **Add Topics**: Use the inbox to add discussion topics manually
2. **Configure Timers**: Set discussion and debrief cycle lengths (in minutes)
3. **Start Cycle**: Click "Start Cycle" to begin
   - System assigns 4 topics to the 4 breakout rooms
   - Bots autonomously choose which room to join based on interest
   - Discussions happen simultaneously in all rooms
   - Each room's moderator facilitates the discussion and captures insights
4. **Debrief Phase**: After discussions, bots return to main room
   - Bots share insights from their discussions
   - Main moderator synthesizes cross-cutting themes
5. **Export**: All whiteboards are automatically exported to text files
6. **Reset**: System clears and is ready for the next cycle

## 🎯 How It Works

### Discussion Cycle

1. **Topic Assignment**: Main moderator grabs 4 topics from inbox and assigns to rooms
2. **Room Selection**: Each bot decides which topic interests them most
3. **Breakout Discussions**:
   - Room moderator introduces the topic
   - Bots share initial thoughts
   - Moderator asks follow-up questions
   - 2-3 rounds of discussion
   - Moderator synthesizes key insights
4. **All discussions happen in parallel**

### Debrief Cycle

1. **Return to Main**: All bots return to main conference room
2. **Share Insights**: Bots from each room share their main takeaways
3. **Synthesis**: Main moderator identifies cross-cutting themes
4. **Whiteboard**: All insights captured on main whiteboard

### After Cycle

- All whiteboards exported to timestamped text files
- Whiteboards cleared
- Topics marked as discussed
- System ready for next cycle

## 🎤 Observer Bot (OpenAI Whisper API + Gemini)

The observer bot uses **OpenAI's Whisper API** for professional-grade transcription and **Gemini 2.5 Flash** for topic extraction:

### How It Works:

1. **Activate**: Click "Observer Bot" button (🔴 → 🟢)
2. **API Key**: Enter your OpenAI API key when prompted (first time only)
3. **Grant Permissions**: Allow microphone access and select your microphone
4. **Automatic Recording**: Captures audio in 60-second chunks
5. **AI Transcription**: OpenAI Whisper transcribes speech with professional accuracy
6. **AI Analysis**: Transcripts sent to Gemini 2.5 Flash which:
   - Identifies discussion topics and questions
   - Extracts 1-3 relevant topics per segment
7. **Auto-Add to Inbox**: Detected topics appear in the inbox with a 🎤 icon
8. **Ready for Cycles**: Use these real meeting topics in your AI conference cycles!

### Key Features:

✅ **Professional Accuracy** - OpenAI Whisper provides industry-leading transcription
✅ **Multi-language** - Excellent support for Swedish, English, and 50+ languages
✅ **Continuous Recording** - No gaps between recording segments
✅ **Context Preservation** - Keeps 30 minutes of transcript history
✅ **Smart Topic Detection** - Only analyzes new content to avoid duplicates

### Use Cases:

- **Real Meetings**: Run observer during team meetings to capture discussion topics
- **Brainstorming Sessions**: Let AI extract key themes and questions
- **Conference Calls**: Automatically document what's being discussed
- **Follow-up Processing**: After meeting, use captured topics for deeper AI analysis
- **Debug Mode**: Save audio files for verification and quality testing

### Technical Details:

- **Transcription**: OpenAI Whisper API (whisper-1 model)
- **Topic Extraction**: Gemini 2.5 Flash via OpenRouter API
- **Languages**: Swedish (configurable to other languages)
- **Recording**: 60-second chunks with continuous capture
- **Processing**: Analyzes when 50+ new characters of transcript available

**Requirements**:
- Modern browser (Chrome, Edge, or Firefox)
- OpenAI API key for Whisper transcription
- OpenRouter API key for Gemini topic extraction
- Microphone access

## 🛠️ Customization

### Changing Bot Models

Edit the `bots` array in `app.js`:

```javascript
{
    id: 'bot1',
    name: 'Analyzer',
    avatar: '🔍',
    model: 'anthropic/claude-3.5-sonnet', // Change this
    systemPrompt: 'Your custom prompt...',
    messageHistory: [],
    currentRoom: 'main'
}
```

Available models on OpenRouter:
- `anthropic/claude-3.5-sonnet`
- `openai/gpt-4-turbo`
- `google/gemini-pro`
- `meta-llama/llama-3.1-70b-instruct`
- Many more at [openrouter.ai/models](https://openrouter.ai/models)

### Adding More Bots

Simply add new bot objects to the `bots` array with unique configurations.

### Adjusting Discussion Depth

In `runRoomDiscussion()`, change the number of discussion rounds:

```javascript
for (let round = 0; round < 2; round++) { // Change this number
    // Discussion logic
}
```

## 📊 Use Cases

- **Team Meetings**: Use as a tool during meetings to capture and organize topics
- **Brainstorming**: Generate diverse perspectives on complex topics
- **Research**: Explore topics from multiple analytical angles
- **Education**: Demonstrate different thinking styles and debate techniques
- **AI Experimentation**: Compare how different models approach the same topic

## 🔒 Privacy & Costs

- All data stays in your browser (except API calls to OpenRouter)
- OpenRouter charges based on model usage (see [pricing](https://openrouter.ai/))
- Typical cycle with 6 bots might use ~$0.10-$0.50 depending on models
- You can limit costs by using cheaper models or reducing discussion rounds

## 🎨 Architecture

```
Main Conference Room
├── Main Moderator (synthesizes insights)
├── 6 Participant Bots (with unique personalities)
└── Main Whiteboard

4 Breakout Rooms
├── Room 1-4 Moderators (facilitate discussions)
├── Dynamic bot participants
└── Room whiteboards

Topic Inbox
├── Manual entry
└── Observer bot (audio → topics)

Cycle Management
├── Discussion phase (configurable timer)
├── Debrief phase (configurable timer)
└── Export & reset
```

## 🐛 Troubleshooting

**"API key not configured"**
- Set your OpenRouter key: `localStorage.setItem('openrouter_api_key', 'sk-...')`

**Bots not responding**
- Check browser console for API errors
- Verify your OpenRouter API key is valid and has credits
- Check your internet connection

**Observer bot not working**
- Grant microphone permissions when prompted
- Note: Transcription integration required for topic extraction

**Topics not assigned**
- Need at least 4 topics in inbox before starting cycle
- Check that topics aren't already marked as assigned

## 📝 License

MIT License - feel free to use and modify for your purposes!

## 🤝 Contributing

This is an experimental project. Ideas for improvements:

- Integrate transcription services for observer bot
- Add conversation threading and references
- Implement bot voting on insights
- Add visual conversation maps
- Support for more than 4 breakout rooms
- Persistent storage of session history
- Export to different formats (Markdown, JSON, PDF)

## 🙏 Credits

Built with:
- OpenRouter for multi-model AI access
- Vanilla JavaScript (no frameworks needed!)
- Modern CSS Grid and Flexbox
- Web Audio API for observer bot

---

**Enjoy your AI-powered conferences! 🎉**
