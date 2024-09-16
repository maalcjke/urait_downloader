document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('downloadBtn').addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: parseAndDownloadPages,
          args: [tab.title]
        });
        
        console.log('Результат:', results);
      } catch (error) {
        console.error('Не удалось запустить скрипт:', error);
        alert('Похоже, что content.js не смог произвести инжект в документ. Скорее всего вы находитесь на старнице urait');
      }
    });
  
    // Function to update the list of recent files
    function updateRecentFiles() {
      chrome.storage.local.get(['recentFiles'], function(result) {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        const recentFiles = result.recentFiles || [];
        recentFiles.forEach(file => {
          const li = document.createElement('li');
          li.textContent = file;
          fileList.appendChild(li);
        });
      });
    }
  
    // Update the list when the popup is opened
    updateRecentFiles();
  
    // Listen for changes in storage and update the list
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if (namespace === 'local' && changes.recentFiles) {
        updateRecentFiles();
      }
    });
  });
  
  // This function will be injected into the page
  function parseAndDownloadPages(pageTitle) {
    console.log('Executing in content script context');
    console.log('jspdf availability:', typeof jspdf);
    console.log('window.jspdf availability:', typeof window.jspdf);
    
    if (typeof window.parseAndDownloadPages === 'function') {
      window.parseAndDownloadPages(pageTitle);
    } else {
      console.error('parseAndDownloadPages function not found in content script');
      alert('Error: parseAndDownloadPages function not found. Please check if the content script is properly injected.');
    }
  }