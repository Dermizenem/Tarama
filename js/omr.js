/**
 * OMR Module - Optik İşaret Tanıma (Enhanced)
 * OpenCV.js ile gelişmiş form analizi
 */

let cvReady = false;

function onOpenCvReady() {
    cvReady = true;
    console.log('OpenCV.js hazır!');
    if (typeof UI !== 'undefined') {
        UI.showStatus('Sistem hazır', 'success');
    }
}

const OMR = {
    settings: null,
    DEBUG: false, // Debug modu

    init() {
        this.settings = Storage.getSettings();
    },

    updateSettings(newSettings) {
        this.settings = newSettings;
    },

    /**
     * Görüntüyü analiz et ve puanları döndür
     * @param {HTMLCanvasElement} canvas - Çekilen görüntü
     * @returns {Object} Analiz sonucu
     */
    async processImage(canvas) {
        if (!cvReady) {
            return { success: false, error: 'OpenCV henüz yüklenmedi' };
        }

        try {
            const settings = this.settings || Storage.getSettings();
            const { itemCount, likertType, scoreDirection, reverseItems } = settings;

            // Canvas'tan OpenCV Mat oluştur
            const src = cv.imread(canvas);
            const gray = new cv.Mat();
            const binary = new cv.Mat();
            const edges = new cv.Mat();

            // Gri tonlamaya çevir
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

            // Gürültü azaltma
            cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);

            // Kağıt köşelerini bul
            const corners = this.detectPaperCorners(gray);

            let processedMat = gray;

            if (corners && corners.length === 4) {
                // Perspektif düzeltme
                processedMat = this.warpPerspective(gray, corners, canvas.width, canvas.height);
            }

            // Adaptive threshold ile binary'ye çevir
            cv.adaptiveThreshold(
                processedMat,
                binary,
                255,
                cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv.THRESH_BINARY_INV,
                15,
                10
            );

            // Morfolojik işlemler (gürültü temizleme)
            const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
            cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, kernel);
            cv.morphologyEx(binary, binary, cv.MORPH_OPEN, kernel);

            // Cevapları analiz et
            const analysisResult = this.analyzeAnswers(binary, itemCount, likertType, scoreDirection);

            // Ters puanlama uygula
            const scores = this.applyReverseScoring(
                analysisResult.scores,
                reverseItems || [],
                likertType
            );

            // Toplam hesapla
            const validScores = scores.filter(s => s > 0);
            const total = validScores.reduce((a, b) => a + b, 0);

            // Belleği temizle
            src.delete();
            gray.delete();
            binary.delete();
            edges.delete();
            kernel.delete();
            if (processedMat !== gray) processedMat.delete();

            return {
                success: true,
                scores: scores,
                rawScores: analysisResult.scores,
                total: total,
                validCount: validScores.length,
                errorCount: scores.filter(s => s <= 0).length,
                errorItems: scores.map((s, i) => s <= 0 ? i + 1 : null).filter(x => x !== null),
                reverseItems: reverseItems || []
            };

        } catch (error) {
            console.error('OMR işleme hatası:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Kağıt köşelerini tespit et
     * @param {cv.Mat} grayMat - Gri tonlamalı görüntü
     * @returns {Array} 4 köşe noktası
     */
    detectPaperCorners(grayMat) {
        try {
            const edges = new cv.Mat();
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();

            // Kenar tespiti
            cv.Canny(grayMat, edges, 50, 150);

            // Kenarları genişlet
            const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
            cv.dilate(edges, edges, kernel);

            // Konturları bul
            cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            let maxArea = 0;
            let bestContour = null;

            // En büyük dikdörtgen konturu bul
            for (let i = 0; i < contours.size(); i++) {
                const contour = contours.get(i);
                const area = cv.contourArea(contour);

                if (area > maxArea) {
                    const peri = cv.arcLength(contour, true);
                    const approx = new cv.Mat();
                    cv.approxPolyDP(contour, approx, 0.02 * peri, true);

                    // 4 köşeli mi?
                    if (approx.rows === 4) {
                        maxArea = area;
                        bestContour = approx;
                    } else {
                        approx.delete();
                    }
                }
            }

            edges.delete();
            contours.delete();
            hierarchy.delete();
            kernel.delete();

            if (bestContour && maxArea > (grayMat.rows * grayMat.cols * 0.1)) {
                // Köşeleri çıkar
                const corners = [];
                for (let i = 0; i < 4; i++) {
                    corners.push({
                        x: bestContour.intAt(i, 0),
                        y: bestContour.intAt(i, 1)
                    });
                }
                bestContour.delete();

                // Köşeleri sırala (sol-üst, sağ-üst, sağ-alt, sol-alt)
                return this.orderCorners(corners);
            }

            return null;
        } catch (e) {
            console.warn('Köşe algılama hatası:', e);
            return null;
        }
    },

    /**
     * Köşeleri sırala (TL, TR, BR, BL)
     */
    orderCorners(corners) {
        // Y'ye göre sırala
        corners.sort((a, b) => a.y - b.y);

        // Üst iki ve alt iki
        const top = corners.slice(0, 2).sort((a, b) => a.x - b.x);
        const bottom = corners.slice(2, 4).sort((a, b) => a.x - b.x);

        return [top[0], top[1], bottom[1], bottom[0]]; // TL, TR, BR, BL
    },

    /**
     * Perspektif düzeltme
     */
    warpPerspective(src, corners, width, height) {
        try {
            const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
                corners[0].x, corners[0].y,
                corners[1].x, corners[1].y,
                corners[2].x, corners[2].y,
                corners[3].x, corners[3].y
            ]);

            // A4 oranı (1:1.414)
            const targetHeight = height;
            const targetWidth = Math.floor(targetHeight / 1.414);

            const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
                0, 0,
                targetWidth, 0,
                targetWidth, targetHeight,
                0, targetHeight
            ]);

            const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
            const dst = new cv.Mat();
            cv.warpPerspective(src, dst, M, new cv.Size(targetWidth, targetHeight));

            srcPoints.delete();
            dstPoints.delete();
            M.delete();

            return dst;
        } catch (e) {
            console.warn('Perspektif düzeltme hatası:', e);
            return src;
        }
    },

    /**
     * Cevapları analiz et
     */
    analyzeAnswers(binaryMat, itemCount, likertType, scoreDirection) {
        const scores = [];
        const confidences = [];
        const height = binaryMat.rows;
        const width = binaryMat.cols;

        // Form alanını tahmin et
        // Üst kısım: başlık + açıklama + demografik + Likert etiketleri = yaklaşık %28
        // Alt margin = %3
        const startY = Math.floor(height * 0.28);
        const endY = Math.floor(height * 0.97);
        const rowHeight = (endY - startY) / itemCount;

        // Cevap kutularının x konumu (sağ taraf)
        // PDF'te bubbleAreaStart = pageWidth - margin - bubbleAreaWidth - 10
        // A4 oranında yaklaşık %70-95 arası
        const startX = Math.floor(width * 0.70);
        const endX = Math.floor(width * 0.95);
        const colWidth = (endX - startX) / likertType;

        if (this.DEBUG) {
            console.log('OMR Debug:', { height, width, startY, endY, startX, endX, rowHeight, colWidth });
        }

        // Her madde için analiz
        for (let row = 0; row < itemCount; row++) {
            const y = startY + row * rowHeight + rowHeight * 0.15;
            const h = rowHeight * 0.6;

            let maxDensity = 0;
            let selectedCol = -1;
            let secondMaxDensity = 0;

            for (let col = 0; col < likertType; col++) {
                const x = startX + col * colWidth + colWidth * 0.1;
                const w = colWidth * 0.8;

                // Hücre yoğunluğunu hesapla
                const density = this.getCellDensity(binaryMat, x, y, w, h);

                if (this.DEBUG && row < 3) {
                    console.log(`Row ${row}, Col ${col}: density = ${density.toFixed(3)}`);
                }

                if (density > maxDensity) {
                    secondMaxDensity = maxDensity;
                    maxDensity = density;
                    selectedCol = col;
                } else if (density > secondMaxDensity) {
                    secondMaxDensity = density;
                }
            }

            // Güvenilirlik kontrolü - eşik değerlerini düşürdük
            const confidence = maxDensity > 0 ? (maxDensity - secondMaxDensity) / maxDensity : 0;
            confidences.push(confidence);

            // Puan hesapla - daha düşük eşik değerleri
            if (selectedCol >= 0 && maxDensity > 0.08 && confidence > 0.2) {
                if (scoreDirection === 'high_to_low') {
                    scores.push(likertType - selectedCol);
                } else {
                    scores.push(selectedCol + 1);
                }
            } else {
                scores.push(0); // İşaret bulunamadı veya belirsiz
            }
        }

        return { scores, confidences };
    },

    /**
     * Hücre doluluk yoğunluğunu hesapla
     */
    getCellDensity(mat, x, y, w, h) {
        try {
            x = Math.max(0, Math.floor(x));
            y = Math.max(0, Math.floor(y));
            w = Math.min(mat.cols - x, Math.floor(w));
            h = Math.min(mat.rows - y, Math.floor(h));

            if (w <= 0 || h <= 0) return 0;

            const roi = mat.roi(new cv.Rect(x, y, w, h));
            const mean = cv.mean(roi);
            roi.delete();

            return mean[0] / 255;
        } catch (e) {
            return 0;
        }
    },

    /**
     * Ters puanlama uygula
     * @param {Array} scores - Ham puanlar
     * @param {Array} reverseItems - Ters madde numaraları (1-indexed)
     * @param {number} likertType - Likert tipi (3, 5, 7)
     * @returns {Array} Düzeltilmiş puanlar
     */
    applyReverseScoring(scores, reverseItems, likertType) {
        if (!reverseItems || reverseItems.length === 0) {
            return scores;
        }

        return scores.map((score, index) => {
            const itemNumber = index + 1; // 1-indexed

            if (reverseItems.includes(itemNumber) && score > 0) {
                // Ters puanlama: 1↔5, 2↔4, 3↔3 (5'li için)
                // Formül: (likertType + 1) - score
                return (likertType + 1) - score;
            }

            return score;
        });
    },

    /**
     * Simülasyon modu - test için rastgele puanlar
     */
    simulateProcess(itemCount, likertType, reverseItems = []) {
        const rawScores = [];

        for (let i = 0; i < itemCount; i++) {
            // %5 hata, %95 geçerli puan
            if (Math.random() < 0.05) {
                rawScores.push(0);
            } else {
                rawScores.push(Math.floor(Math.random() * likertType) + 1);
            }
        }

        // Ters puanlama uygula
        const scores = this.applyReverseScoring(rawScores, reverseItems, likertType);

        const validScores = scores.filter(s => s > 0);
        const total = validScores.reduce((a, b) => a + b, 0);

        return {
            success: true,
            scores: scores,
            rawScores: rawScores,
            total: total,
            validCount: validScores.length,
            errorCount: scores.filter(s => s <= 0).length,
            errorItems: scores.map((s, i) => s <= 0 ? i + 1 : null).filter(x => x !== null),
            reverseItems: reverseItems
        };
    }
};
