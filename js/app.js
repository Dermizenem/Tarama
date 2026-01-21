/**
 * App Module - Ana Uygulama (Enhanced)
 * Modülleri başlatır ve koordine eder
 */

const App = {
    isProcessing: false,
    autoSaveTimer: null,

    async init() {
        console.log('🚀 Likert OMR Uygulaması başlatılıyor...');

        // Modülleri başlat
        UI.init();
        OMR.init();

        // Kamerayı başlat
        const cameraReady = await Camera.init();

        if (cameraReady) {
            UI.showStatus('Formu çerçeveye hizalayın', 'info');
            console.log('✅ Kamera hazır');
        } else {
            UI.showStatus('Kamera başlatılamadı - Galeriyi kullanabilirsiniz', 'warning');
            console.log('⚠️ Kamera başlatılamadı');
        }

        // OpenCV durumu
        if (!cvReady) {
            console.log('⏳ OpenCV yükleniyor...');
        }

        console.log('✅ Uygulama başlatıldı');
    },

    /**
     * Fotoğraf çek ve işle
     */
    async captureAndProcess() {
        if (this.isProcessing) {
            console.log('Zaten işleniyor, bekleniyor...');
            return;
        }

        if (!Camera.isReady) {
            UI.showStatus('Kamera hazır değil!', 'error');
            return;
        }

        this.isProcessing = true;
        UI.showStatus('İşleniyor...', 'info');
        UI.showLoading(true);

        try {
            // Fotoğraf çek
            const canvas = Camera.captureFrame();

            if (!canvas) {
                throw new Error('Fotoğraf çekilemedi');
            }

            // OMR işle
            let result;
            const settings = Storage.getSettings();

            if (cvReady) {
                result = await OMR.processImage(canvas);
            } else {
                // OpenCV yüklenmemişse simülasyon
                result = OMR.simulateProcess(
                    settings.itemCount,
                    settings.likertType,
                    settings.reverseItems
                );
                console.log('⚠️ Simülasyon modu (OpenCV yüklenmedi)');
            }

            UI.showLoading(false);

            if (result.success) {
                // Kaydet
                const savedForm = Storage.saveForm({
                    scores: result.scores,
                    rawScores: result.rawScores,
                    total: result.total,
                    validCount: result.validCount,
                    errorCount: result.errorCount,
                    reverseItems: result.reverseItems
                });

                // UI güncelle
                UI.updateFormCount();
                UI.showResultModal(result);

                // Hata varsa uyar
                if (result.errorCount > 0) {
                    UI.showStatus(`✅ Kaydedildi (${result.errorCount} madde okunamadı)`, 'warning');
                } else {
                    UI.showStatus('✅ Form başarıyla kaydedildi!', 'success');
                }

                // Otomatik modal kapanma
                if (settings.autoSaveDelay > 0) {
                    setTimeout(() => {
                        UI.hideResultModal();
                    }, 2000);
                }

                console.log('✅ Form kaydedildi:', savedForm.id);

            } else {
                UI.showStatus('❌ ' + (result.error || 'İşleme hatası'), 'error');
                console.error('OMR hatası:', result.error);
            }

        } catch (error) {
            UI.showLoading(false);
            console.error('İşleme hatası:', error);
            UI.showStatus('Hata: ' + error.message, 'error');
        }

        this.isProcessing = false;
    },

    /**
     * Galeri görüntüsünü işle
     * @param {HTMLCanvasElement} canvas 
     */
    async processGalleryImage(canvas) {
        const settings = Storage.getSettings();

        if (cvReady) {
            return await OMR.processImage(canvas);
        } else {
            return OMR.simulateProcess(
                settings.itemCount,
                settings.likertType,
                settings.reverseItems
            );
        }
    },

    /**
     * Otomatik tarama döngüsü
     */
    startAutoScan() {
        const settings = Storage.getSettings();
        const delay = settings.autoSaveDelay;

        if (delay <= 0) return;

        this.autoSaveTimer = setInterval(() => {
            if (this.detectFormInFrame()) {
                UI.startCountdown(delay, () => {
                    this.captureAndProcess();
                });
            }
        }, 1000);
    },

    stopAutoScan() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        UI.stopCountdown();
    },

    /**
     * Çerçevede form algılama
     * TODO: Gerçek form algılama implementasyonu
     */
    detectFormInFrame() {
        // Basit algılama - şimdilik false döndürüyoruz (manuel mod)
        // Gerçek uygulamada köşe markerları kontrol edilir
        return false;
    }
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Service Worker kayıt (PWA)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('✅ Service Worker kayıtlı'))
        .catch(err => console.log('⚠️ SW hatası:', err));
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Space veya Enter ile fotoğraf çek
    if ((e.code === 'Space' || e.code === 'Enter') && UI.currentPage === 'cameraPage') {
        e.preventDefault();
        App.captureAndProcess();
    }

    // Escape ile modal kapat
    if (e.code === 'Escape') {
        UI.hideResultModal();
        document.getElementById('galleryProcessModal')?.classList.add('hidden');
    }
});
