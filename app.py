from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename

# Import your analysis functions from LegalDocAnalyser.py
from LegalDocAnalyser import extract_text, summarize_document, extract_clauses, summarize_clause

app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    text = extract_text(filepath)
    summary = summarize_document(text)
    clauses = extract_clauses(text)
    clause_summaries = [summarize_clause(c) for c in clauses]
    return jsonify({
        'summary': summary,
        'clauses': clause_summaries
    })

if __name__ == '__main__':
    app.run(debug=True)
