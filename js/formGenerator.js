/**
 * Form Generator Module - Yazdırılabilir Form Oluşturma
 * PDF ve PNG formatında Likert ölçek formları üretir
 * Türkçe karakter desteği için Canvas kullanılır
 */

const FormGenerator = {
    // Varsayılan Likert etiketleri
    DEFAULT_LABELS: {
        3: ['Katılmıyorum', 'Kararsızım', 'Katılıyorum'],
        5: ['Hiç Katılmıyorum', 'Katılmıyorum', 'Kararsızım', 'Katılıyorum', 'Tamamen Katılıyorum'],
        7: ['Kesinlikle Katılmıyorum', 'Katılmıyorum', 'Biraz Katılmıyorum', 'Kararsızım', 'Biraz Katılıyorum', 'Katılıyorum', 'Kesinlikle Katılıyorum']
    },

    /**
     * Form yapılandırması oluştur
     */
    createConfig(options = {}) {
        const likertType = options.likertType || 5;

        return {
            title: options.title || 'Likert Ölçeği',
            description: options.description || 'Aşağıdaki ifadelere ne ölçüde katıldığınızı belirtiniz.',
            itemCount: options.itemCount || 21,
            likertType: likertType,
            labels: options.labels || this.DEFAULT_LABELS[likertType] || this.DEFAULT_LABELS[5],
            reverseItems: options.reverseItems || [],
            itemTexts: options.itemTexts || [],
            demographics: options.demographics || ['Ad Soyad', 'Tarih', 'Sınıf/Bölüm', 'No'],
            showNumbers: options.showNumbers !== false,
            showLabels: options.showLabels !== false,
            paperSize: options.paperSize || 'a4',
            margin: options.margin || 15,
            fontSize: options.fontSize || 10
        };
    },

    /**
     * HTML önizleme oluştur
     */
    generatePreview(config) {
        const container = document.getElementById('formPreview');
        if (!container) return;

        const labels = config.labels || this.DEFAULT_LABELS[config.likertType];
        const demographics = config.demographics || ['Ad Soyad', 'Tarih', 'Sınıf/Bölüm', 'No'];

        let html = `
            <div class="form-preview-header">
                <div class="form-preview-title">${this.escapeHtml(config.title)}</div>
                <div class="form-preview-desc">${this.escapeHtml(config.description)}</div>
            </div>
            
            <div class="form-preview-student">
        `;

        demographics.forEach(field => {
            html += `<div>${this.escapeHtml(field)}: _________________</div>`;
        });

        html += `
            </div>
            
            <div class="form-preview-section-title">MADDELER</div>
            
            <div class="form-preview-likert-labels">
        `;

        for (let i = 0; i < config.likertType; i++) {
            html += `<div class="likert-label-col"><span class="likert-num">${i + 1}</span><span class="likert-text">${this.escapeHtml(labels[i])}</span></div>`;
        }
        html += '</div>';

        for (let i = 1; i <= config.itemCount; i++) {
            const isReverse = config.reverseItems.includes(i);
            const itemText = config.itemTexts?.[i - 1] || '';
            html += `
                <div class="form-preview-item ${isReverse ? 'reverse' : ''}">
                    <div class="form-preview-item-left">
                        <span class="form-preview-item-num">${i}.${isReverse ? '*' : ''}</span>
                        <span class="form-preview-item-text">${this.escapeHtml(itemText) || '___'}</span>
                    </div>
                    <div class="form-preview-item-dots">
            `;

            for (let j = 0; j < config.likertType; j++) {
                html += '<div class="form-preview-dot"></div>';
            }

            html += '</div></div>';
        }

        if (config.reverseItems.length > 0) {
            html += `<p style="font-size:10px; margin-top:10px; color:#666;">* Ters puanlanan maddeler</p>`;
        }

        container.innerHTML = html;
        container.classList.remove('hidden');
    },

    /**
     * PDF oluştur
     */
    generatePDF(config) {
        try {
            if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
                alert('PDF kütüphanesi yüklenemedi!');
                return false;
            }

            const { jsPDF } = window.jspdf;
            const canvasData = this.createFormCanvas(config);

            if (!canvasData) {
                throw new Error('Canvas oluşturulamadı');
            }

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            canvasData.pages.forEach((pageCanvas, index) => {
                if (index > 0) {
                    doc.addPage();
                }

                const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
                doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
            });

            const fileName = this.sanitizeFileName(config.title) + '_Form.pdf';
            doc.save(fileName);

            return true;
        } catch (error) {
            console.error('PDF oluşturma hatası:', error);
            alert('PDF oluşturulamadı: ' + error.message);
            return false;
        }
    },

    /**
     * Form Canvas'ı oluştur - TEK SAYFAYA SIĞDIR
     */
    createFormCanvas(config) {
        const scale = 3;
        const pageWidth = 794;
        const pageHeight = 1123;

        // Madde sayısına göre dinamik margin ve header
        const itemCount = config.itemCount || 21;
        const margin = itemCount > 35 ? 35 : 40;
        const contentWidth = pageWidth - (margin * 2);

        // Başlangıç Y pozisyonu ve header alanı hesabı
        // Çok maddeli formlar için daha kompakt header
        const headerHeight = itemCount > 40 ? 110 : (itemCount > 30 ? 130 : 180);
        const footerHeight = 15;
        const availableHeight = pageHeight - margin - headerHeight - footerHeight;

        // Dinamik boyutlandırma - madde sayısına göre
        const maxItemHeight = Math.floor(availableHeight / itemCount);

        // Minimum ve maksimum sınırlar - 45 maddeye kadar sığsın
        const itemHeight = Math.max(14, Math.min(35, maxItemHeight));
        const fontSize = itemHeight <= 16 ? 8 : (itemHeight <= 20 ? 9 : (itemHeight <= 25 ? 10 : 11));
        const bubbleRadius = itemHeight <= 16 ? 5 : (itemHeight <= 20 ? 6 : (itemHeight <= 25 ? 7 : 9));
        const bubbleSpacing = bubbleRadius * 2.5;

        const bubbleAreaWidth = config.likertType * bubbleSpacing;
        const bubbleAreaStart = pageWidth - margin - bubbleAreaWidth - 10; // 10px ekstra boşluk
        const textAreaWidth = bubbleAreaStart - margin - 50; // Daha dar metin alanı

        const pages = [];
        let currentPage = this.createNewPage(pageWidth, pageHeight, scale);
        let ctx = currentPage.getContext('2d');
        let y = margin + 30;

        // Köşe markerları
        this.drawCanvasCornerMarkers(ctx, pageWidth, pageHeight);

        // ===== BAŞLIK =====
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.textAlign = 'center';
        const titleLines = this.wrapText(ctx, config.title, contentWidth - 40);
        titleLines.forEach(line => {
            ctx.fillText(line, pageWidth / 2, y);
            y += 24;
        });
        y += 5;

        // ===== AÇIKLAMA =====
        ctx.font = '11px Arial, sans-serif';
        const descLines = this.wrapText(ctx, config.description, contentWidth - 40);
        descLines.forEach(line => {
            ctx.fillText(line, pageWidth / 2, y);
            y += 14;
        });
        y += 12;

        // ===== DEMOGRAFİK BİLGİLER - YAN YANA =====
        ctx.textAlign = 'left';
        ctx.font = '10px Arial, sans-serif';
        const demographics = config.demographics || ['Ad Soyad', 'Tarih', 'Sınıf/Bölüm', 'No'];

        // Her alanın genişliğini hesapla - daha dar alanlar, satıra daha fazla sığsın
        const fieldWidth = 170; // Daha dar alan genişliği
        const fieldsPerRow = Math.floor(contentWidth / fieldWidth);
        let currentX = margin;
        let fieldCount = 0;

        demographics.forEach((field) => {
            // Yeni satıra geç gerekirse
            if (fieldCount >= fieldsPerRow) {
                y += 18;
                currentX = margin;
                fieldCount = 0;
            }

            ctx.fillText(`${field}: ______________`, currentX, y);
            currentX += fieldWidth;
            fieldCount++;
        });
        y += 25;

        // ===== AYIRICI ÇİZGİ =====
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(pageWidth - margin, y);
        ctx.stroke();

        // Çizgiden sonra yeterli boşluk bırak
        y += 10;

        // ===== LİKERT ETİKETLERİ - DİKEY YAZIM =====
        const labels = config.labels || this.DEFAULT_LABELS[config.likertType];
        const labelHeight = itemCount > 40 ? 70 : (itemCount > 30 ? 90 : 130); // Çok maddeli formlarda daha kısa etiket alanı

        ctx.fillStyle = '#000000';

        for (let i = 0; i < config.likertType; i++) {
            const x = bubbleAreaStart + (i * bubbleSpacing) + bubbleSpacing / 2;

            // Dikey metin
            ctx.save();
            ctx.translate(x + 4, y);
            ctx.rotate(Math.PI / 2);

            // Etiket metni - tam olarak yaz
            ctx.textAlign = 'left';
            ctx.font = `${fontSize}px Arial, sans-serif`;
            ctx.fillText(labels[i], 0, 0);

            ctx.restore();
        }

        y += labelHeight + 5;

        // ===== MADDELER BAŞLIĞI =====
        ctx.font = `bold ${fontSize + 1}px Arial, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText('MADDELER', margin, y - 5);
        y += 5;

        // ===== MADDELER =====
        ctx.textAlign = 'left';

        for (let i = 1; i <= config.itemCount; i++) {
            const isReverse = config.reverseItems.includes(i);
            const itemText = config.itemTexts?.[i - 1] || '';

            // Metin satırlarını hesapla
            ctx.font = `${fontSize}px Arial, sans-serif`;
            const textLines = itemText ? this.wrapText(ctx, itemText, textAreaWidth) : [];
            const textHeight = textLines.length * (fontSize + 3);
            const currentItemHeight = Math.max(itemHeight, textHeight + 8);

            // Madde numarası
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.fillStyle = '#000000';
            const numText = `${i}.${isReverse ? '*' : ''}`;
            ctx.fillText(numText, margin, y + currentItemHeight / 2 + 3);

            // Madde metni
            if (textLines.length > 0) {
                ctx.font = `${fontSize}px Arial, sans-serif`;
                const textStartY = y + (currentItemHeight - textHeight) / 2 + fontSize;
                textLines.forEach((line, idx) => {
                    ctx.fillText(line, margin + 25, textStartY + (idx * (fontSize + 3)));
                });
            }

            // Optik daireler
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.2;
            const circleY = y + currentItemHeight / 2;

            for (let j = 0; j < config.likertType; j++) {
                const cx = bubbleAreaStart + (j * bubbleSpacing) + bubbleSpacing / 2;
                ctx.beginPath();
                ctx.arc(cx, circleY, bubbleRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Alt çizgi
            ctx.strokeStyle = '#aaaaaa';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(margin, y + currentItemHeight);
            ctx.lineTo(pageWidth - margin, y + currentItemHeight);
            ctx.stroke();

            y += currentItemHeight + 2;
        }

        // Ters madde açıklaması
        if (config.reverseItems.length > 0) {
            y += 5;
            ctx.font = `italic ${fontSize - 1}px Arial, sans-serif`;
            ctx.fillStyle = '#666666';
            ctx.textAlign = 'left';
            ctx.fillText(`* Ters puanlanan maddeler: ${config.reverseItems.join(', ')}`, margin, y);
        }

        pages.push(currentPage);

        return { pages };
    },

    /**
     * Yeni sayfa Canvas'ı oluştur
     */
    createNewPage(width, height, scale) {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        return canvas;
    },

    /**
     * Köşe markerları çiz
     */
    drawCanvasCornerMarkers(ctx, width, height) {
        const size = 15;
        const offset = 25; // Daha içeride - yazıcılarda kesilmesin

        ctx.fillStyle = '#000000';
        ctx.fillRect(offset, offset, size, size);
        ctx.fillRect(width - offset - size, offset, size, size);
        ctx.fillRect(offset, height - offset - size, size, size);
        ctx.fillRect(width - offset - size, height - offset - size, size, size);
    },

    /**
     * PNG oluştur ve indir
     */
    generatePNG(config) {
        try {
            const canvasData = this.createFormCanvas(config);

            if (!canvasData || !canvasData.pages.length) {
                throw new Error('Canvas oluşturulamadı');
            }

            canvasData.pages.forEach((pageCanvas, index) => {
                const link = document.createElement('a');
                const suffix = canvasData.pages.length > 1 ? `_Sayfa${index + 1}` : '';
                link.download = this.sanitizeFileName(config.title) + suffix + '_Form.png';
                link.href = pageCanvas.toDataURL('image/png');
                link.click();
            });

            return true;
        } catch (error) {
            console.error('PNG oluşturma hatası:', error);
            alert('PNG oluşturulamadı: ' + error.message);
            return false;
        }
    },

    /**
     * Metni satırlara böl
     */
    wrapText(ctx, text, maxWidth) {
        if (!text) return [''];

        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines.length > 0 ? lines : [''];
    },

    /**
     * Dosya adını temizle
     */
    sanitizeFileName(text) {
        return text.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
    },

    /**
     * Likert etiket input'larını güncelle
     */
    updateLikertLabelsUI(likertType) {
        const container = document.getElementById('likertLabelsContainer');
        if (!container) return;

        const labels = this.DEFAULT_LABELS[likertType] || this.DEFAULT_LABELS[5];

        let html = '';
        for (let i = 0; i < likertType; i++) {
            html += `
                <div class="likert-label-input">
                    <span>${i + 1}</span>
                    <input type="text" 
                           class="likert-label" 
                           data-index="${i}" 
                           value="${this.escapeHtml(labels[i])}" 
                           placeholder="Etiket ${i + 1}">
                </div>
            `;
        }

        container.innerHTML = html;
    },

    /**
     * Mevcut Likert etiketlerini al
     */
    getCurrentLabels(likertType) {
        const inputs = document.querySelectorAll('.likert-label');
        const labels = [];

        inputs.forEach(input => {
            labels.push(input.value || `Seçenek ${parseInt(input.dataset.index) + 1}`);
        });

        while (labels.length < likertType) {
            labels.push(this.DEFAULT_LABELS[likertType]?.[labels.length] || `Seçenek ${labels.length + 1}`);
        }

        return labels;
    },

    /**
     * HTML escape
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
