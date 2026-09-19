/* add.js — handles the add-card form + rich text editor toolbar */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('add-form');

  // ---- Rich Text Editor Toolbar ----
  document.querySelectorAll('.editor-toolbar__btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault(); // prevent losing focus from contenteditable
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;

      // Find which editor this toolbar belongs to
      const editor = btn.closest('.editor');
      const content = editor.querySelector('.editor-content');
      content.focus();

      if (cmd === 'code') {
        // Wrap selection in <code> tag
        const sel = window.getSelection();
        if (sel.rangeCount > 0 && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const selectedText = range.toString();
          range.deleteContents();
          const codeEl = document.createElement('code');
          codeEl.textContent = selectedText;
          range.insertNode(codeEl);
          // Move cursor after the code element
          sel.collapseToEnd();
        }
      } else if (cmd.startsWith('formatBlock-')) {
        const tag = cmd.split('-')[1];
        document.execCommand('formatBlock', false, tag);
      } else {
        document.execCommand(cmd, false, null);
      }

      // Update active state
      updateToolbarState(editor);
    });
  });

  // Update toolbar active states on selection change
  document.addEventListener('selectionchange', () => {
    document.querySelectorAll('.editor').forEach(updateToolbarState);
  });

  function updateToolbarState(editor) {
    editor.querySelectorAll('.editor-toolbar__btn').forEach(btn => {
      const cmd = btn.dataset.cmd;
      if (cmd === 'code' || cmd.startsWith('formatBlock-')) return;
      btn.classList.toggle('active', document.queryCommandState(cmd));
    });
  }

  // ---- Form Submission ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const category = document.getElementById('category-select').value;
    const subcategory = document.getElementById('subcategory-select').value;
    const questionEl = document.getElementById('question-input');
    const answerEl = document.getElementById('answer-input');

    const question = questionEl.innerHTML.trim();
    const answer = answerEl.innerHTML.trim();

    if (!category || !subcategory || !question || !answer) {
      showToast('Please fill all fields', true);
      return;
    }

    await addCard(category, subcategory, question, answer);
    showToast('Card saved! ✓');

    // Reset only Q&A, keep category selection for quick batch adds
    questionEl.innerHTML = '';
    answerEl.innerHTML = '';
    questionEl.focus();
  });
});
