// ─── FARM PROFILE ──────────────────────────────────────────────
let farmData = {};

// ─── SHOW / HIDE SECTIONS ──────────────────────────────────────
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 300, behavior: 'smooth' });
}

// ─── SAVE FARM PROFILE ─────────────────────────────────────────
function saveFarmProfile() {
  var name       = document.getElementById('farmer-name').value.trim();
  var village    = document.getElementById('village').value.trim();
  var crop       = document.getElementById('crop').value;
  var soil       = document.getElementById('soil').value;
  var irrigation = document.getElementById('irrigation').value;
  var size       = document.getElementById('farm-size').value;
  var problems   = document.getElementById('problems').value.trim();

  if (!name || !village || !crop || !soil || !irrigation) {
    alert('Please fill all fields before continuing!');
    return;
  }

  farmData = { name: name, village: village, crop: crop, soil: soil, irrigation: irrigation, size: size, problems: problems };

  var predCrop = document.getElementById('pred-crop');
  if (predCrop) predCrop.textContent = crop;

  alert('Farm profile saved for ' + name + '! Going to AI Advice...');
  showSection('ai-advice');

  document.getElementById('voice-text').textContent =
    'What is the best advice for my ' + crop + ' farm in ' + village + '?';
  getAIAdvice();
}

// ─── VOICE INPUT ───────────────────────────────────────────────
var recognition = null;
var isListening = false;

function startVoice() {
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    alert('Voice not supported. Please use Chrome!');
    return;
  }

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = 'te-IN';
  recognition.interimResults = false;

  var btn     = document.getElementById('voice-btn');
  var textBox = document.getElementById('voice-text');

  if (isListening) {
    recognition.stop();
    isListening = false;
    btn.classList.remove('listening');
    btn.textContent = 'Tap to Speak (Telugu / Hindi / English)';
    return;
  }

  recognition.start();
  isListening = true;
  btn.classList.add('listening');
  btn.textContent = 'Listening... Tap to Stop';
  textBox.textContent = 'Listening...';

  recognition.onresult = function(event) {
    textBox.textContent = event.results[0][0].transcript;
    isListening = false;
    btn.classList.remove('listening');
    btn.textContent = 'Tap to Speak (Telugu / Hindi / English)';
  };

  recognition.onerror = function() {
    textBox.textContent = 'Could not hear clearly. Please try again.';
    isListening = false;
    btn.classList.remove('listening');
    btn.textContent = 'Tap to Speak (Telugu / Hindi / English)';
  };

  recognition.onend = function() {
    isListening = false;
    btn.classList.remove('listening');
    btn.textContent = 'Tap to Speak (Telugu / Hindi / English)';
  };
}

// ─── GET AI ADVICE ─────────────────────────────────────────────
async function getAIAdvice() {
  var question    = document.getElementById('voice-text').textContent.trim();
  var responseBox = document.getElementById('ai-response');

  if (!question || question === 'Your speech will appear here...') {
    alert('Please speak or type a question first!');
    return;
  }

  responseBox.textContent = 'Getting advice from AI...';

  var farmContext = farmData.name
    ? 'Farmer: ' + farmData.name + ', Village: ' + farmData.village + ', Crop: ' + farmData.crop + ', Soil: ' + farmData.soil + ', Irrigation: ' + farmData.irrigation + ', Farm Size: ' + farmData.size + ' acres, Problems: ' + (farmData.problems || 'None') + '.'
    : 'No farm profile — give general advice.';

  var prompt = 'You are KrishiMitra AI, a helpful agricultural advisor for Indian farmers.\n\nFarm Profile:\n' + farmContext + '\n\nFarmer Question: ' + question + '\n\nGive practical advice in simple language. Explain WHY. Max 150 words. End with one action step.';

  try {
    var res  = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + CONFIG.geminiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    var data = await res.json();
    console.log(data);

    var text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text;
    responseBox.textContent = text || 'No response. Check console for details.';

  } catch (err) {
    responseBox.textContent = 'Error: ' + err.message;
    console.error(err);
  }
}

// ─── CROP DOCTOR ───────────────────────────────────────────────
function previewImage(event) {
  var img = document.getElementById('preview-img');
  img.src = URL.createObjectURL(event.target.files[0]);
  img.style.display = 'block';
}

async function diagnoseCrop() {
  var fileInput = document.getElementById('crop-img');
  var resultBox = document.getElementById('diagnosis-result');

  if (!fileInput.files[0]) {
    alert('Please upload a crop photo first!');
    return;
  }

  resultBox.textContent = 'Analyzing your crop image...';

  var file       = fileInput.files[0];
  var base64     = await toBase64(file);
  var base64Data = base64.split(',')[1];

  var prompt = 'You are an expert plant disease detector. Look at this crop image and provide: 1) What crop is this? 2) What disease or problem do you see? 3) Severity: Mild/Moderate/Severe 4) Treatment steps 5) What to buy (Indian market) 6) How urgent? Keep it simple and farmer-friendly. Max 150 words.';

  try {
    var res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + CONFIG.geminiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: file.type, data: base64Data } }] }]
      })
    });

    var data   = await res.json();
    var result = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text;
    resultBox.textContent = result || 'Could not analyze. Try a clearer photo.';

  } catch (err) {
    resultBox.textContent = 'Error: ' + err.message;
    console.error(err);
  }
}

function toBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload  = function() { resolve(reader.result); };
    reader.onerror = reject;
  });
}