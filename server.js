require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'biology-reader.html'));
});

function getPrompt(question, pageNum, topicTitle) {
  return `You are EduFusion AI, a helpful and concise education assistant. A student is reading a ${topicTitle} lesson on page ${pageNum}. The student asked: "${question}". Provide a clear, friendly, and detailed explanation that matches the lesson's topic and helps the student understand the concept. Use examples when relevant, and keep your answer focused on the question.`;
}

function getFallbackResponse(question, pageNum, topicTitle) {
  const lower = question.toLowerCase();
  if (lower.includes('difference') && lower.includes('mitosis')) {
    return 'Mitosis creates two identical diploid cells for growth and repair, while meiosis creates four genetically unique haploid cells for reproduction. Mitosis keeps chromosomes the same, whereas meiosis halves them.';
  }
  if (lower.includes('chlorophyll')) {
    return 'Chlorophyll is the green pigment in plant cells that absorbs light. It captures energy from sunlight and uses it to power the first stage of photosynthesis.';
  }
  if (lower.includes('dominant') || lower.includes('recessive')) {
    return 'A dominant allele will show its trait when present, while a recessive allele only shows its trait when both copies are recessive. If an organism has one dominant and one recessive allele, the dominant trait appears.';
  }
  if (lower.includes('cell membrane')) {
    return 'The cell membrane is a protective barrier that controls what enters and leaves the cell. It keeps the cell stable and allows important nutrients in while blocking harmful substances.';
  }
  return `Here is a clear explanation for ${topicTitle}: it covers the key ideas from the lesson and helps you understand the topic step by step. If you want more detail on a specific part, ask another question.`;
}

app.post('/api/ask', async (req, res) => {
  const { question, pageNum, topicTitle } = req.body || {};
  if (!question) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  try {
    const prompt = getPrompt(question, pageNum, topicTitle);
    const response = await fetch(`${ollamaUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: 'system', content: 'You are EduFusion AI, an educational assistant for biology students.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 450,
        temperature: 0.8
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Ollama request failed with status ${response.status}`);
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) {
      return res.json({ response: text });
    }
  } catch (error) {
    console.error('Ollama API error:', error.message || error);
    const fallback = getFallbackResponse(question, pageNum, topicTitle);
    return res.json({ response: fallback });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const statusResponse = await fetch(`${ollamaUrl}/v1/models`);
    const statusData = await statusResponse.json();
    const available = statusResponse.ok && Array.isArray(statusData?.models);
    return res.json({ status: available ? 'ok' : 'unavailable', ai: 'Ollama (local)', available, model: ollamaModel });
  } catch (error) {
    console.error('Ollama status error:', error.message || error);
    return res.json({ status: 'unavailable', ai: 'Ollama (local)', available: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`EduFusion API server listening on http://localhost:${port}`);
  console.log(`AI Service: Ollama (local)`);
});
