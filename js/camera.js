/**
 * Camera Module - Kamera ve Galeri Yönetimi
 * Kamera erişimi, fotoğraf çekimi ve galeri desteği
 */

const Camera = {
    video: null,
    canvas: null,
    stream: null,
    isReady: false,

    async init() {
        this.video = document.getElementById('cameraFeed');
        this.canvas = document.createElement('canvas');

        try {
            // Arka kamerayı tercih et (mobil için)
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            // Video hazır olunca
            await new Promise(resolve => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });

            // Canvas boyutlarını ayarla
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            this.isReady = true;
            console.log('Kamera hazır:', this.canvas.width, 'x', this.canvas.height);
            return true;

        } catch (error) {
            console.error('Kamera hatası:', error);

            // Hata türüne göre mesaj
            let errorMsg = 'Kamera erişimi reddedildi!';
            if (error.name === 'NotFoundError') {
                errorMsg = 'Kamera bulunamadı!';
            } else if (error.name === 'NotAllowedError') {
                errorMsg = 'Kamera izni verilmedi!';
            } else if (error.name === 'NotReadableError') {
                errorMsg = 'Kamera başka bir uygulama tarafından kullanılıyor!';
            }

            if (typeof UI !== 'undefined') {
                UI.showStatus(errorMsg, 'error');
            }
            return false;
        }
    },

    captureFrame() {
        if (!this.isReady) return null;

        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);
        return this.canvas;
    },

    captureAsDataURL(quality = 0.9) {
        if (!this.isReady) return null;

        this.captureFrame();
        return this.canvas.toDataURL('image/jpeg', quality);
    },

    captureAsBlob(quality = 0.9) {
        return new Promise(resolve => {
            if (!this.isReady) {
                resolve(null);
                return;
            }

            this.captureFrame();
            this.canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
        });
    },

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.isReady = false;
        }
    },

    async restart() {
        this.stop();
        await this.init();
    },

    // ===== Galeri Desteği =====

    /**
     * Galeri input'unu tetikle
     */
    openGallery() {
        const input = document.getElementById('galleryInput');
        if (input) {
            input.click();
        }
    },

    /**
     * Seçilen dosyaları işle
     * @param {FileList} files - Seçilen dosyalar
     * @returns {Promise<Array>} - İşlenmiş görüntüler
     */
    async processGalleryFiles(files) {
        const images = [];

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                console.warn('Desteklenmeyen dosya türü:', file.type);
                continue;
            }

            try {
                const imageData = await this.loadImageFile(file);
                images.push({
                    file: file,
                    name: file.name,
                    canvas: imageData.canvas,
                    dataURL: imageData.dataURL
                });
            } catch (error) {
                console.error('Dosya yüklenirken hata:', file.name, error);
            }
        }

        return images;
    },

    /**
     * Dosyayı Canvas'a yükle
     * @param {File} file - Görüntü dosyası
     * @returns {Promise<Object>} - Canvas ve DataURL
     */
    loadImageFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    // Canvas oluştur
                    const canvas = document.createElement('canvas');

                    // Maksimum boyut (performans için)
                    const MAX_SIZE = 2000;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_SIZE || height > MAX_SIZE) {
                        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
                        width = Math.floor(width * ratio);
                        height = Math.floor(height * ratio);
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    resolve({
                        canvas: canvas,
                        dataURL: canvas.toDataURL('image/jpeg', 0.9),
                        originalWidth: img.width,
                        originalHeight: img.height
                    });
                };

                img.onerror = () => reject(new Error('Görüntü yüklenemedi'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Dosya okunamadı'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * URL'den görüntü yükle
     * @param {string} url - Görüntü URL'si
     * @returns {Promise<HTMLCanvasElement>}
     */
    loadImageFromURL(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                resolve(canvas);
            };

            img.onerror = () => reject(new Error('Görüntü yüklenemedi'));
            img.src = url;
        });
    }
};
