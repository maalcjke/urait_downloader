console.log('[Urait Downloader] основной функционал загружен');

// Function to load external scripts
function loadScript(url) {
  console.log(`Пробуем загрузить скрипт: ${url}`);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => {
      console.log(`Скрипт загружен успешно: ${url}`);
      resolve();
    };
    script.onerror = (error) => {
      console.error(`не удалось загрузить скрипт ${url}:`, error);
      reject(error);
    };
    document.head.appendChild(script);
  });
}

// Function to scroll to an element and wait for content to load
function scrollToElement(element) {
  console.log('Скроллим до элемента...');
  return new Promise((resolve) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      console.log('Успешный скролл, ждем загрузки...');
      resolve();
    }, 2000);
  });
}

// Function to get all page elements
function getAllPageElements() {
  console.log('Получаем все страницы...');
  const elements = Array.from(document.querySelectorAll('div.element.page'));
  console.log(`Найдено ${elements.length} страниц`);
  return elements;
}

// Function to resize an image
function resizeImage(imgData, maxWidth, maxHeight) {
  console.log('Форматирование изображения...');
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      console.log('Изображение отформатировано под пдф');
      resolve(canvas.toDataURL('image/jpeg', 0.7)); // Reduced JPEG quality
    };
    img.src = imgData;
  });
}

// Function to get page content
async function getPageContent(element, index) {
  console.log(`Получаем контент со страницы ${index + 1}...`);
  await scrollToElement(element);

  const canvas = element.querySelector('canvas');
  if (!canvas) {
    console.error(`Canvas not found on page ${index + 1}`);
    return await captureElementScreenshot(element, index);
  }

  if (canvas.width === 0 || canvas.height === 0) {
    console.log(`Не удалось получить доступ к странице ${index + 1}, пробуем другой метод`);
    return await captureElementScreenshot(element, index);
  }

  try {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    const ctx = newCanvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    ctx.drawImage(canvas, 0, 0);
    const imgData = newCanvas.toDataURL('image/jpeg', 0.7);
    return await resizeImage(imgData, 1000, 1414); // A4 proportions at 72 DPI
  } catch (error) {
    console.error(`Не удалось получить данные со страницы ${index + 1}:`, error);
    return await captureElementScreenshot(element, index);
  }
}

// Function to create a screenshot of an element
async function captureElementScreenshot(element, index) {
  console.log(`Используем обходной путь ${index + 1} через html2canvas`);
  
  try {
    const screenshot = await html2canvas(element, {
      logging: false,
      useCORS: true,
      allowTaint: true,
      backgroundColor: 'white'
    });
    const imgData = screenshot.toDataURL('image/jpeg', 0.7);
    return await resizeImage(imgData, 1000, 1414); // A4 proportions at 72 DPI
  } catch (error) {
    console.error(`не удалось заскринить ${index + 1}:`, error);
    return null;
  }
}

function getDocumentPages() {
    const pageElements = document.querySelectorAll('.document-page');
    return Array.from(pageElements).map(el => {
      const number = el.querySelector('.document-page__number')?.textContent.trim();
      const title = el.querySelector('.document-page__title')?.textContent.trim();
      return { number, title };
    });
  }
  
  // Function to create PDF
  async function createPDF(contents, documentPages) {
    console.log('Создаем PDF...');
    const jsPDFConstructor = window.jspdf ? window.jspdf.jsPDF : jspdf.jsPDF;
    const pdf = new jsPDFConstructor({
      orientation: 'p',
      unit: 'pt',
      format: 'a4',
      compress: true
    });
  
    // Add document pages to the beginning of the PDF
    pdf.setFontSize(12);
    pdf.text('Содержание', 40, 40);
    let y = 60;
    documentPages.forEach(page => {
      if (y > 800) {  // If we're near the bottom of the page, start a new one
        pdf.addPage();
        y = 40;
      }
      pdf.text(`${page.number}: ${page.title}`, 40, y);
      y += 20;
    });
  
    // Add a page break after the table of contents
    pdf.addPage();
  
    // Add the rest of the content
    for (let i = 0; i < contents.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      const img = contents[i];
      pdf.addImage(img, 'JPEG', 0, 0, 595, 842); // A4 size in points
    }
  
    console.log('PDF успешно создан');
    return pdf;
  }
  

// Function to download PDF
function downloadPDF(pdf, pageTitle) {
    console.log('Выдача PDF...');
    const safePageTitle = pageTitle.replace(/[^a-zа-яё0-9]/gi, '_').toLowerCase();
    pdf.save(`${safePageTitle}.pdf`);
  }
  
  // Main function
  async function parseAndDownloadPages(pageTitle) {
    console.log('Начинаем получение страниц...');
    try {
      console.log('Проверяем доступ к jspdf...');
      console.log('window.jspdf:', window.jspdf);
      console.log('typeof jspdf:', typeof jspdf);
      console.log('typeof window.jspdf:', typeof window.jspdf);
  
      if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
        throw new Error('jsPDF не удалось загрузить/встроить скрипт.');
      }
  
      const pageElements = getAllPageElements();
      const totalPages = pageElements.length;
  
      console.log(`Всего страниц у учебника: ${totalPages}`);
  
      const startPage = parseInt(prompt(`Начинаем с какой страницы? (1-${totalPages}):`, '1'));
      const endPage = parseInt(prompt(`До какой страницы? (${startPage}-${totalPages}):`, totalPages.toString()));
  
      if (isNaN(startPage) || isNaN(endPage) || startPage < 1 || endPage > totalPages || startPage > endPage) {
        alert('Что-то со страницей');
        return;
      }
  
      const documentPages = getDocumentPages();
    console.log('Страницы документа:', documentPages);

    const contents = [];
    for (let i = startPage - 1; i < endPage; i++) {
      console.log(`Начинаем парсинг ${i + 1}...`);
      const content = await getPageContent(pageElements[i], i);
      if (content) {
        contents.push(content);
      }
    }

    if (contents.length === 0) {
      alert('Страницы не найдены');
      return;
    }

    console.log('Создаем PDF...');
    const pdf = await createPDF(contents, documentPages);
    console.log('Выдаем на загрузку PDF...');
    downloadPDF(pdf, pageTitle);
    
    // Add this line to save the file name to chrome.storage
    chrome.storage.local.get(['recentFiles'], function(result) {
      let recentFiles = result.recentFiles || [];
      recentFiles.unshift(`${pageTitle.replace(/[^a-zа-яё0-9]/gi, '_').toLowerCase()}.pdf`);
      recentFiles = recentFiles.slice(0, 5); // Keep only the 5 most recent files
      chrome.storage.local.set({recentFiles: recentFiles});
    });

    console.log('Задача успешно завершена!');

  } catch (error) {
    console.error('Произошла ошибка:', error);
    alert('Ошибка внутри скрипта, подробности в консоли браузера');
  }
  }
  
  // Make parseAndDownloadPages available globally
  window.parseAndDownloadPages = parseAndDownloadPages;