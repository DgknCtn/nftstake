document.addEventListener('DOMContentLoaded', () => {
    const connectWalletBtn = document.getElementById('connect-wallet');
    const walletPopup = document.getElementById('wallet-popup');
    const closePopupBtn = document.getElementById('close-popup');
    const walletOptions = document.querySelectorAll('.wallet-option');
    const countdownElement = document.getElementById('countdown');

    // Cüzdan bağlama popup'ı
    connectWalletBtn.addEventListener('click', () => {
        walletPopup.style.display = 'flex';
        document.body.classList.add('popup-open');
    });

    closePopupBtn.addEventListener('click', () => {
        walletPopup.style.display = 'none';
        document.body.classList.remove('popup-open');
    });

    walletOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedWallet = option.getAttribute('data-wallet');
            console.log(`${selectedWallet} cüzdanı seçildi`);
            // Burada seçilen cüzdanla bağlantı kurma işlemlerini yapabilirsiniz
            walletPopup.style.display = 'none';
        });
    });

    // Geri sayım sayacı
    const countdownDate = new Date("2023-12-31T23:59:59").getTime();

    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = countdownDate - now;

        const months = Math.floor(distance / (1000 * 60 * 60 * 24 * 30));
        const days = Math.floor((distance % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownElement.innerHTML = `${months} Ay ${days} Gün ${hours}:${minutes}:${seconds}`;

        if (distance < 0) {
            clearInterval(countdownInterval);
            countdownElement.innerHTML = "Süre doldu!";
        }
    };

    const countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown(); // İlk yükleme için sayacı hemen başlat
});