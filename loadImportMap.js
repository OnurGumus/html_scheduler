// loadImportMap.js

async function loadImportMap(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch import map: ${response.status} ${response.statusText}`);
      }
      const importMap = await response.json();
  
      // Create a script element with type="importmap"
      const script = document.createElement('script');
      script.type = 'importmap';
      script.textContent = JSON.stringify(importMap);
      document.head.appendChild(script);
  
      // Once the import map is loaded, dynamically load the module script
      const moduleScript = document.createElement('script');
      moduleScript.type = 'module';
      moduleScript.src = 'index.js'; // This points to your main module
      document.body.appendChild(moduleScript);
  
    } catch (error) {
      console.error('Error loading import map:', error);
    }
  }
  
  // Load the import map before any modules are loaded
  loadImportMap('https://cdn.jsdelivr.net/gh/OnurGumus/html_scheduler@main/importmap.json');
  