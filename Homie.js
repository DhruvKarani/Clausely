document.addEventListener('DOMContentLoaded', function() {

document.getElementById('uploadBtn').addEventListener('click', async function() {
  const fileInput = document.getElementById('pdfInput');
  const outputDiv = document.getElementById('output');
  const spinner = document.getElementById('spinner');
  outputDiv.innerHTML = '';
  if (spinner) spinner.style.display = 'block';
  // Clear chat history on new upload
  const chatHistory = document.getElementById('chat-history');
  if (chatHistory) chatHistory.innerHTML = '';

  if (!fileInput.files.length) {
    outputDiv.innerHTML = '<p style="color:red;">Please select a PDF file.</p>';
    if (spinner) spinner.style.display = 'none';
    return;
  }
  // File validation
  const file = fileInput.files[0];
  if (file.type !== 'application/pdf') {
    outputDiv.innerHTML = '<p style="color:red;">Only PDF files are allowed.</p>';
    if (spinner) spinner.style.display = 'none';
    return;
  }
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    outputDiv.innerHTML = '<p style="color:red;">File is too large (max 10MB).</p>';
    if (spinner) spinner.style.display = 'none';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('http://localhost:5000/analyze', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Server error');
    const data = await response.json();
    if (spinner) spinner.style.display = 'none';

    // Summary with toggle arrow
    let html = `<div id="summary-section" class="summary-toggle"><span class="summary-arrow">&#9654;</span>Summary</div>`;
    html += `<div id="summary-content" class="summary-content">${data.summary}</div>`;
    html += `<h2>Clauses</h2><div id='clauses-list'>`;
    data.clauses.forEach((clause, idx) => {
      html += `<div class='clause-summary' data-idx='${idx}' style='cursor:pointer;padding:8px 0;border-bottom:1px solid #e3e8ee;'><b>${clause.name}</b><br><span class='clause-desc'>${clause.summary}</span><div class='clause-full' style='display:none;color:#4e54c8;margin-top:0.5rem;'></div></div>`;
    });
    html += `</div>`;
    outputDiv.innerHTML = html;

    // Summary toggle logic
    const summarySection = document.getElementById('summary-section');
    const summaryContent = document.getElementById('summary-content');
    summarySection.addEventListener('click', function() {
      summarySection.classList.toggle('summary-collapsed');
      if (summaryContent.style.display === 'none') {
        summaryContent.style.display = 'block';
      } else {
        summaryContent.style.display = 'none';
      }
    });
    // Start collapsed
    summarySection.classList.add('summary-collapsed');
    summaryContent.style.display = 'none';

    // Add click event for clause expansion
    document.querySelectorAll('.clause-summary').forEach(el => {
      el.addEventListener('click', function() {
        const idx = this.getAttribute('data-idx');
        const fullDiv = this.querySelector('.clause-full');
        if (fullDiv.style.display === 'block') {
          fullDiv.style.display = 'none';
        } else {
          fullDiv.textContent = data.typed_clauses[idx].text;
          fullDiv.style.display = 'block';
        }
      });
    });

    // Store last analysis for download
    window.lastAnalysis = data;
  } catch (err) {
    if (spinner) spinner.style.display = 'none';
    outputDiv.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
});

// Download results as CSV
const downloadBtn = document.getElementById('downloadBtn');
if (downloadBtn) {
  downloadBtn.addEventListener('click', function() {
    const data = window.lastAnalysis;
    if (!data) return alert('No analysis to download.');
    let csv = 'Clause Name,Description,Full Text\n';
    data.clauses.forEach((clause, idx) => {
      const full = data.typed_clauses[idx]?.text?.replace(/\n/g, ' ').replace(/"/g, '""') || '';
      csv += `"${clause.name}","${clause.summary}","${full}"
`;
    });
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'legal_doc_analysis.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Help/FAQ modal logic
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('help-modal');
const closeHelp = document.getElementById('close-help');
if (helpBtn && helpModal && closeHelp) {
  helpBtn.onclick = () => {
    helpModal.style.display = 'flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  closeHelp.onclick = () => { helpModal.style.display = 'none'; };
}

// Chat functionality
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatHistory = document.getElementById('chat-history');

function appendChatBubble(text, sender) {
  const div = document.createElement('div');
  div.className = 'chat-bubble ' + sender;
  div.innerHTML = text;
  // Always append at the bottom (default), but ensure order is preserved
  chatHistory.appendChild(div);
  // Scroll to the bottom after DOM update
  setTimeout(() => {
    div.scrollIntoView({ behavior: 'smooth', block: 'end' });
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }, 0);
}

sendBtn.addEventListener('click', async function() {
  const question = chatInput.value.trim();
  if (!question) return;
  appendChatBubble(question, 'user');
  chatInput.value = '';
  appendChatBubble('...', 'bot');
  try {
    console.log('Sending chat request:', question);
    const response = await fetch('http://localhost:5000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    console.log('Chat response status:', response.status);
    const data = await response.json();
    chatHistory.removeChild(chatHistory.lastChild); // remove '...'
    if (data.answer) {
      appendChatBubble(data.answer, 'bot');
    } else {
      appendChatBubble('No answer received from server.', 'bot');
    }
    console.log('Chat response data:', data);
  } catch (err) {
    chatHistory.removeChild(chatHistory.lastChild);
    appendChatBubble('Error: ' + err.message, 'bot');
    console.error('Chat fetch error:', err);
  }
});

chatInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendBtn.click();
});

}); // End of DOMContentLoaded
