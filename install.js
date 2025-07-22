
let deferredPrompt;
const installButton = document.createElement('button');
const iosInstallBanner = document.createElement('div');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

function showInstallButton() {
  installButton.textContent = 'Instalar App';
  installButton.className = 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors fixed bottom-4 right-4 z-50';
  document.body.appendChild(installButton);

  installButton.addEventListener('click', async () => {
    installButton.style.display = 'none';
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
  });
}

function showIosInstallBanner() {
    iosInstallBanner.innerHTML = `
    <div class="bg-gray-800 text-white p-4 rounded-lg shadow-lg fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between">
        <p class="text-sm">Para instalar, toque no ícone de Compartilhar e depois em "Adicionar à Tela de Início".</p>
        <button onclick="dismissIosBanner()" class="text-white font-bold">X</button>
    </div>
    `;
    document.body.appendChild(iosInstallBanner);
}

window.dismissIosBanner = () => {
    iosInstallBanner.remove();
}

function isIOS() {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
    // iPad on iOS 13 detection
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}

// Mostra o banner de instalação apenas se não estiver no modo standalone (app já instalado)
if (isIOS() && !window.navigator.standalone) {
    showIosInstallBanner();
}
