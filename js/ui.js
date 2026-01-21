/**
 * UI Module - Arayüz Kontrolü (Enhanced)
 * Sayfa yönetimi, galeri işleme, Excel export
 */

const UI = {
    currentPage: 'cameraPage',
    countdownInterval: null,
    countdownValue: 0,

    init() {
        this.bindEvents();
        this.updateFormCount();
        this.loadSettings();
        this.initFormCreator();
    },

    bindEvents() {
        // Sayfa geçişleri
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showPage(btn.dataset.target);
            });
        });

        // Ayarlar butonu
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.showPage('settingsPage');
        });

        // Formlar butonu
        document.getElementById('savedFormsBtn')?.addEventListener('click', () => {
            this.showPage('savedFormsPage');
            this.loadFormsList();
        });

        // Form oluştur butonu
        document.getElementById('createFormBtn')?.addEventListener('click', () => {
            this.showPage('createFormPage');
            this.initFormCreator();
        });

        // Manuel çekim butonu
        document.getElementById('manualCaptureBtn')?.addEventListener('click', () => {
            App.captureAndProcess();
        });

        // Galeri butonu
        document.getElementById('galleryBtn')?.addEventListener('click', () => {
            Camera.openGallery();
        });

        // Galeri input değişikliği
        document.getElementById('galleryInput')?.addEventListener('change', (e) => {
            this.handleGallerySelection(e.target.files);
        });

        // Ayarları kaydet
        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // Excel'e aktar
        document.getElementById('exportExcelBtn')?.addEventListener('click', () => {
            this.exportToExcel();
        });

        // Tümünü sil
        document.getElementById('clearAllBtn')?.addEventListener('click', () => {
            if (confirm('Tüm formları silmek istediğinize emin misiniz?')) {
                Storage.clearAllForms();
                this.loadFormsList();
                this.updateFormCount();
                this.showStatus('Tüm formlar silindi', 'success');
            }
        });

        // Sonuç modalını kapat
        document.getElementById('closeResultBtn')?.addEventListener('click', () => {
            this.hideResultModal();
        });

        // Galeri modal kapat
        document.getElementById('closeGalleryBtn')?.addEventListener('click', () => {
            document.getElementById('galleryProcessModal')?.classList.add('hidden');
        });

        // Form oluşturucu butonları
        document.getElementById('previewFormBtn')?.addEventListener('click', () => {
            this.previewForm();
        });

        document.getElementById('generatePDFBtn')?.addEventListener('click', () => {
            this.generateFormPDF();
        });

        document.getElementById('generatePNGBtn')?.addEventListener('click', () => {
            this.generateFormPNG();
        });

        // ===== YENİ: Şablonlar ve Form Yönetimi =====

        // Şablonlarım butonu
        document.getElementById('myTemplatesBtn')?.addEventListener('click', () => {
            this.showPage('templatesPage');
            this.loadTemplatesList();
        });

        // Şablon kaydet butonu
        document.getElementById('saveTemplateBtn')?.addEventListener('click', () => {
            this.saveFormAsTemplate();
        });

        // Değişiklikleri kaydet butonu
        document.getElementById('saveChangesBtn')?.addEventListener('click', () => {
            this.saveFormChanges();
        });

        // Görünüm toggle butonları
        document.getElementById('listViewBtn')?.addEventListener('click', () => {
            this.switchView('list');
        });

        document.getElementById('tableViewBtn')?.addEventListener('click', () => {
            this.switchView('table');
        });

        // Context menu (sağ tık) yönetimi
        document.addEventListener('contextmenu', (e) => {
            const formItem = e.target.closest('.form-item');
            const resultCell = e.target.closest('.result-cell');

            if (formItem || resultCell) {
                e.preventDefault();
                this.showContextMenu(e, formItem || resultCell);
            }
        });

        // Context menu dışı tıklama
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Context menu aksiyonları
        document.getElementById('contextMenu')?.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleContextAction(action);
            }
        });

        // Likert tipi değişikliği (form oluşturucu)
        document.getElementById('newFormLikert')?.addEventListener('change', (e) => {
            FormGenerator.updateLikertLabelsUI(parseInt(e.target.value));
        });

        // Madde metinleri oluştur butonu
        document.getElementById('generateItemsBtn')?.addEventListener('click', () => {
            this.generateItemTextInputs();
        });

        // Madde sayısı değiştiğinde uyarı
        document.getElementById('newFormItems')?.addEventListener('change', () => {
            const container = document.getElementById('itemTextsContainer');
            if (container && container.querySelectorAll('.item-text-row').length > 0) {
                if (confirm('Madde sayısı değişti. Madde metin alanlarını yeniden oluşturmak ister misiniz?')) {
                    this.generateItemTextInputs();
                }
            }
        });

        // Demografik alan ekle butonu
        document.getElementById('addDemographicBtn')?.addEventListener('click', () => {
            this.addDemographicField();
        });
    },

    // ===== Sayfa Yönetimi =====

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId)?.classList.add('active');
        this.currentPage = pageId;
    },

    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = 'status-message ' + type;
        }
    },

    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
    },

    // ===== Form Sayısı =====

    updateFormCount() {
        const count = Storage.getFormCount();
        const countEl = document.getElementById('formCount');
        if (countEl) {
            countEl.textContent = count;
        }
    },

    // ===== Ayarlar =====

    loadSettings() {
        const settings = Storage.getSettings();

        const itemCountEl = document.getElementById('itemCount');
        const likertTypeEl = document.getElementById('likertType');
        const autoSaveDelayEl = document.getElementById('autoSaveDelay');
        const scoreDirectionEl = document.getElementById('scoreDirection');
        const reverseItemsEl = document.getElementById('reverseItems');

        if (itemCountEl) itemCountEl.value = settings.itemCount;
        if (likertTypeEl) likertTypeEl.value = settings.likertType;
        if (autoSaveDelayEl) autoSaveDelayEl.value = settings.autoSaveDelay;
        if (scoreDirectionEl) scoreDirectionEl.value = settings.scoreDirection;
        if (reverseItemsEl) {
            reverseItemsEl.value = (settings.reverseItems || []).join(',');
        }
    },

    saveSettings() {
        const reverseItemsInput = document.getElementById('reverseItems')?.value || '';
        const reverseItems = this.parseReverseItems(reverseItemsInput);

        const settings = {
            itemCount: parseInt(document.getElementById('itemCount')?.value) || 21,
            likertType: parseInt(document.getElementById('likertType')?.value) || 5,
            autoSaveDelay: parseInt(document.getElementById('autoSaveDelay')?.value) || 5,
            scoreDirection: document.getElementById('scoreDirection')?.value || 'low_to_high',
            reverseItems: reverseItems
        };

        Storage.saveSettings(settings);
        OMR.updateSettings(settings);

        this.showPage('cameraPage');
        this.showStatus('Ayarlar kaydedildi', 'success');
    },

    /**
     * Ters madde string'ini parse et
     */
    parseReverseItems(input) {
        if (!input || !input.trim()) return [];

        const items = [];
        const parts = input.split(/[,;\s]+/);

        for (const part of parts) {
            const num = parseInt(part.trim());
            if (!isNaN(num) && num > 0) {
                items.push(num);
            }
        }

        // Tekrarlananları kaldır ve sırala
        return [...new Set(items)].sort((a, b) => a - b);
    },

    // ===== Formlar Listesi =====

    loadFormsList() {
        const forms = Storage.getSavedForms();
        const container = document.getElementById('formsList');

        if (!container) return;

        if (forms.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>Henüz kaydedilmiş form yok</p>
                </div>
            `;
            return;
        }

        container.innerHTML = forms.map(form => {
            const date = new Date(form.timestamp);
            const errorInfo = form.errorCount > 0 ?
                `<span style="color:var(--danger)"> (${form.errorCount} hata)</span>` : '';

            // Dosya adı veya Form ID
            const formName = form.name || `Form #${form.id.toString().slice(-4)}`;

            return `
                <div class="form-item" data-id="${form.id}" data-form-id="${form.id}" onclick="UI.showFormPreview(${form.id})">
                    <div class="form-item-info">
                        <div class="form-item-name">${this.escapeHtml(formName)}</div>
                        <div class="form-item-details">
                            ${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR')} • 
                            ${form.likertType || 5}'li Likert • 
                            ${form.validCount || 0}/${form.scores?.length || 0} madde${errorInfo}
                        </div>
                    </div>
                    <div class="form-item-score">${form.total || 0}</div>
                    <button class="form-item-delete" onclick="event.stopPropagation(); UI.deleteForm(${form.id})">🗑️</button>
                </div>
            `;
        }).join('');
    },

    /**
     * Form görüntüsünü göster
     */
    showFormPreview(formId) {
        const forms = Storage.getSavedForms();
        const form = forms.find(f => f.id === formId);

        if (!form) return;

        if (form.imageData) {
            // Modal oluştur
            const modal = document.createElement('div');
            modal.className = 'image-preview-modal';
            modal.innerHTML = `
                <div class="image-preview-content">
                    <div class="image-preview-header">
                        <span>${this.escapeHtml(form.name || 'Form')}</span>
                        <button onclick="this.closest('.image-preview-modal').remove()">✕</button>
                    </div>
                    <img src="${form.imageData}" alt="Form Görüntüsü">
                </div>
            `;
            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };
            document.body.appendChild(modal);
        } else {
            alert('Bu form için görüntü mevcut değil.\n(Sadece yeni taramalar için görüntü kaydedilir)');
        }
    },

    deleteForm(formId) {
        if (confirm('Bu formu silmek istediğinize emin misiniz?')) {
            Storage.deleteForm(formId);
            this.loadFormsList();
            this.updateFormCount();
        }
    },

    // ===== Excel Export =====

    exportToExcel() {
        this.showLoading(true);

        setTimeout(() => {
            const success = Storage.exportToExcel();
            this.showLoading(false);

            if (success) {
                this.showStatus('Excel dosyası indirildi', 'success');
            }
        }, 100);
    },

    // ===== Galeri İşleme =====

    async handleGallerySelection(files) {
        if (!files || files.length === 0) return;

        const modal = document.getElementById('galleryProcessModal');
        const progressFill = document.getElementById('galleryProgressFill');
        const progressText = document.getElementById('galleryProgressText');
        const resultsContainer = document.getElementById('galleryResults');
        const closeBtn = document.getElementById('closeGalleryBtn');

        // Modal'ı göster
        modal?.classList.remove('hidden');
        if (closeBtn) closeBtn.disabled = true;
        if (resultsContainer) resultsContainer.innerHTML = '';

        const images = await Camera.processGalleryFiles(files);
        const total = images.length;
        let processed = 0;
        let successCount = 0;

        for (const imageData of images) {
            try {
                // Progress güncelle
                if (progressText) {
                    progressText.textContent = `${processed + 1} / ${total}`;
                }
                if (progressFill) {
                    progressFill.style.width = `${((processed + 1) / total) * 100}%`;
                }

                // OMR işle
                let result;
                if (cvReady) {
                    result = await OMR.processImage(imageData.canvas);
                } else {
                    const settings = Storage.getSettings();
                    result = OMR.simulateProcess(
                        settings.itemCount,
                        settings.likertType,
                        settings.reverseItems
                    );
                }

                if (result.success) {
                    // Kaydet - dosya adı ve görsel ile birlikte
                    Storage.saveForm({
                        name: imageData.name.replace(/\.[^.]+$/, ''), // Uzantıyı kaldır
                        scores: result.scores,
                        total: result.total,
                        validCount: result.validCount,
                        errorCount: result.errorCount,
                        imageData: imageData.canvas.toDataURL('image/jpeg', 0.5) // Görsel base64
                    });
                    successCount++;

                    // Sonuç göster
                    if (resultsContainer) {
                        resultsContainer.innerHTML += `
                            <div class="gallery-result-item success">
                                ✅ ${imageData.name}: Toplam ${result.total} (${result.validCount}/${result.scores.length})
                            </div>
                        `;
                    }
                } else {
                    if (resultsContainer) {
                        resultsContainer.innerHTML += `
                            <div class="gallery-result-item error">
                                ❌ ${imageData.name}: ${result.error || 'Hata'}
                            </div>
                        `;
                    }
                }
            } catch (error) {
                console.error('Galeri işleme hatası:', imageData.name, error);
                if (resultsContainer) {
                    resultsContainer.innerHTML += `
                        <div class="gallery-result-item error">
                            ❌ ${imageData.name}: ${error.message}
                        </div>
                    `;
                }
            }

            processed++;
        }

        // Tamamlandı
        if (closeBtn) closeBtn.disabled = false;
        this.updateFormCount();

        // Özet
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="gallery-result-item" style="font-weight:bold;">
                    📊 Toplam: ${successCount}/${total} form başarıyla işlendi
                </div>
            ` + resultsContainer.innerHTML;
        }

        // Input'u temizle
        const input = document.getElementById('galleryInput');
        if (input) input.value = '';
    },

    // ===== Geri Sayım =====

    startCountdown(seconds, callback) {
        this.countdownValue = seconds;
        const countdownEl = document.getElementById('countdown');
        const numberEl = document.getElementById('countdownNumber');

        countdownEl?.classList.remove('hidden');
        if (numberEl) numberEl.textContent = this.countdownValue;

        this.countdownInterval = setInterval(() => {
            this.countdownValue--;

            if (this.countdownValue <= 0) {
                this.stopCountdown();
                callback();
            } else {
                if (numberEl) numberEl.textContent = this.countdownValue;
            }
        }, 1000);
    },

    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        document.getElementById('countdown')?.classList.add('hidden');
    },

    // ===== Sonuç Modalı =====

    showResultModal(result) {
        const modal = document.getElementById('resultModal');
        const totalEl = document.getElementById('totalScore');
        const scoresContainer = document.getElementById('itemScores');
        const errorItemsEl = document.getElementById('errorItems');
        const errorListEl = document.getElementById('errorItemsList');

        if (totalEl) totalEl.textContent = result.total;

        // Madde puanları
        if (scoresContainer) {
            const reverseItems = result.reverseItems || [];

            scoresContainer.innerHTML = result.scores.map((score, idx) => {
                const itemNum = idx + 1;
                const isError = score <= 0;
                const isReversed = reverseItems.includes(itemNum);

                let className = 'item-score';
                if (isError) className += ' error';
                if (isReversed) className += ' reversed';

                const label = isReversed ? `M${itemNum}*` : `M${itemNum}`;
                const value = score > 0 ? score : '?';

                return `<div class="${className}">${label}: ${value}</div>`;
            }).join('');
        }

        // Hatalı maddeler
        if (errorItemsEl && errorListEl) {
            if (result.errorItems && result.errorItems.length > 0) {
                errorListEl.textContent = result.errorItems.join(', ');
                errorItemsEl.classList.remove('hidden');
            } else {
                errorItemsEl.classList.add('hidden');
            }
        }

        modal?.classList.remove('hidden');

        // Titreşim (başarılı)
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
    },

    hideResultModal() {
        document.getElementById('resultModal')?.classList.add('hidden');
    },

    // ===== Form Oluşturucu =====

    initFormCreator() {
        const likertType = parseInt(document.getElementById('newFormLikert')?.value) || 5;
        FormGenerator.updateLikertLabelsUI(likertType);
        this.initDemographics();
    },

    previewForm() {
        const config = this.getFormConfig();
        FormGenerator.generatePreview(config);
    },

    generateFormPDF() {
        this.showLoading(true);

        setTimeout(() => {
            const config = this.getFormConfig();
            const success = FormGenerator.generatePDF(config);
            this.showLoading(false);

            if (success) {
                this.showStatus('PDF indirildi', 'success');
            }
        }, 100);
    },

    generateFormPNG() {
        this.showLoading(true);

        setTimeout(() => {
            const config = this.getFormConfig();
            const success = FormGenerator.generatePNG(config);
            this.showLoading(false);

            if (success) {
                this.showStatus('PNG indirildi', 'success');
            }
        }, 100);
    },

    getFormConfig() {
        const likertType = parseInt(document.getElementById('newFormLikert')?.value) || 5;
        const reverseInput = document.getElementById('newFormReverseItems')?.value || '';
        const itemCount = parseInt(document.getElementById('newFormItems')?.value) || 21;

        return FormGenerator.createConfig({
            title: document.getElementById('formTitle')?.value || 'Likert Ölçeği',
            description: document.getElementById('formDescription')?.value || 'Aşağıdaki ifadelere ne ölçüde katıldığınızı belirtiniz.',
            itemCount: itemCount,
            likertType: likertType,
            labels: FormGenerator.getCurrentLabels(likertType),
            reverseItems: this.parseReverseItems(reverseInput),
            itemTexts: this.getItemTexts(itemCount),
            demographics: this.getDemographicFields()
        });
    },

    // ===== Demografik Alan Yönetimi =====

    /**
     * Varsayılan demografik alanları oluştur
     */
    initDemographics() {
        const container = document.getElementById('demographicsContainer');
        if (!container) return;

        // Varsayılan alanlar
        const defaultFields = ['Ad Soyad', 'Tarih', 'Sınıf/Bölüm', 'No'];

        container.innerHTML = '';
        defaultFields.forEach(field => {
            this.addDemographicField(field);
        });
    },

    /**
     * Yeni demografik alan ekle
     */
    addDemographicField(value = '') {
        const container = document.getElementById('demographicsContainer');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'demographic-row';
        row.innerHTML = `
            <input type="text" class="demographic-input" value="${this.escapeHtml(value)}" placeholder="Alan adı (ör: Cinsiyet)">
            <button class="demographic-delete" onclick="UI.removeDemographicField(this)" title="Sil">🗑️</button>
        `;
        container.appendChild(row);
    },

    /**
     * Demografik alan sil
     */
    removeDemographicField(btn) {
        const row = btn.closest('.demographic-row');
        if (row) {
            row.remove();
        }
    },

    /**
     * Tüm demografik alanları al
     */
    getDemographicFields() {
        const inputs = document.querySelectorAll('.demographic-input');
        const fields = [];

        inputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                fields.push(value);
            }
        });

        return fields.length > 0 ? fields : ['Ad Soyad', 'Tarih', 'Sınıf/Bölüm', 'No'];
    },

    // ===== Madde Metin Yönetimi =====

    /**
     * Madde metin input alanlarını oluştur
     */
    generateItemTextInputs() {
        const container = document.getElementById('itemTextsContainer');
        if (!container) return;

        const itemCount = parseInt(document.getElementById('newFormItems')?.value) || 21;
        const reverseInput = document.getElementById('newFormReverseItems')?.value || '';
        const reverseItems = this.parseReverseItems(reverseInput);

        // Mevcut değerleri sakla
        const existingTexts = this.getItemTexts(100);

        let html = '';
        for (let i = 1; i <= itemCount; i++) {
            const isReverse = reverseItems.includes(i);
            const existingText = existingTexts[i - 1] || '';

            html += `
                <div class="item-text-row">
                    <div class="item-number ${isReverse ? 'reverse' : ''}" title="${isReverse ? 'Ters puanlanan madde' : ''}">${i}${isReverse ? '*' : ''}</div>
                    <textarea 
                        class="item-text-input" 
                        data-item="${i}" 
                        placeholder="Madde ${i} metnini yazın..."
                        rows="1"
                    >${this.escapeHtml(existingText)}</textarea>
                </div>
            `;
        }

        container.innerHTML = html;

        // Auto-resize için event listener ekle
        container.querySelectorAll('.item-text-input').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
            });
        });
    },

    /**
     * Mevcut madde metinlerini al
     * @param {number} maxItems - Maksimum madde sayısı
     * @returns {Array<string>}
     */
    getItemTexts(maxItems) {
        const texts = [];
        const inputs = document.querySelectorAll('.item-text-input');

        inputs.forEach(input => {
            const itemNum = parseInt(input.dataset.item);
            if (itemNum && itemNum <= maxItems) {
                texts[itemNum - 1] = input.value || '';
            }
        });

        return texts;
    },

    /**
     * HTML karakterlerini escape et
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ===== FORM YÖNETİMİ FONKSİYONLARI =====

    selectedTemplateId: null,
    selectedFormId: null,
    unsavedChanges: false,

    /**
     * Formu şablon olarak kaydet
     */
    saveFormAsTemplate() {
        const config = this.getFormConfig();

        if (!config.title || config.title.trim() === '') {
            alert('Lütfen form başlığı girin!');
            return;
        }

        const template = {
            title: config.title,
            description: config.description,
            itemCount: config.itemCount,
            likertType: config.likertType,
            labels: config.labels,
            reverseItems: config.reverseItems,
            itemTexts: config.itemTexts,
            demographics: config.demographics
        };

        Storage.saveTemplate(template);
        alert('✅ Form şablonu başarıyla kaydedildi!\n\n"📋 Şablonlarım" bölümünden görebilirsiniz.');
        this.showStatus('Form şablonu kaydedildi!', 'success');
    },

    /**
     * Şablon listesini yükle
     */
    loadTemplatesList() {
        const container = document.getElementById('templatesList');
        if (!container) return;

        const templates = Storage.getTemplates();

        if (templates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📋</div>
                    <p>Henüz kayıtlı form şablonu yok.</p>
                    <p>Form Oluştur sayfasından yeni bir şablon oluşturun.</p>
                </div>
            `;
            return;
        }

        let html = '';
        templates.forEach(template => {
            const isSelected = this.selectedTemplateId === template.id;
            const date = new Date(template.createdAt).toLocaleDateString('tr-TR');

            html += `
                <div class="template-item ${isSelected ? 'selected' : ''}" data-id="${template.id}">
                    <div class="template-info">
                        <h4>${this.escapeHtml(template.title)}</h4>
                        <p>${template.itemCount} madde • ${template.likertType}'li Likert • ${date}</p>
                    </div>
                    <div class="template-actions">
                        <button class="select-btn" onclick="UI.selectTemplate(${template.id})">
                            ${isSelected ? '✓ Seçili' : 'Seç'}
                        </button>
                        <button class="delete-btn" onclick="UI.deleteTemplate(${template.id})">🗑️</button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    /**
     * Şablon seç (tarama için)
     */
    selectTemplate(templateId) {
        this.selectedTemplateId = templateId;

        // Şablon ayarlarını aktif yap
        const templates = Storage.getTemplates();
        const template = templates.find(t => t.id === templateId);

        if (template) {
            Storage.saveSettings({
                itemCount: template.itemCount,
                likertType: template.likertType,
                reverseItems: template.reverseItems || []
            });

            this.showStatus(`"${template.title}" şablonu seçildi`, 'success');
        }

        this.loadTemplatesList();
    },

    /**
     * Şablonu sil
     */
    deleteTemplate(templateId) {
        if (confirm('Bu şablonu silmek istediğinize emin misiniz?')) {
            Storage.deleteTemplate(templateId);

            if (this.selectedTemplateId === templateId) {
                this.selectedTemplateId = null;
            }

            this.loadTemplatesList();
            this.showStatus('Şablon silindi', 'success');
        }
    },

    /**
     * Liste/Tablo görünümü değiştir
     */
    switchView(view) {
        const listView = document.getElementById('formsList');
        const tableView = document.getElementById('resultsTable');
        const listBtn = document.getElementById('listViewBtn');
        const tableBtn = document.getElementById('tableViewBtn');

        if (view === 'list') {
            listView?.classList.remove('hidden');
            tableView?.classList.add('hidden');
            listBtn?.classList.add('active');
            tableBtn?.classList.remove('active');
        } else {
            listView?.classList.add('hidden');
            tableView?.classList.remove('hidden');
            listBtn?.classList.remove('active');
            tableBtn?.classList.add('active');
            this.renderResultsTable();
        }
    },

    /**
     * Sonuç tablosunu oluştur
     */
    renderResultsTable() {
        const container = document.getElementById('resultsTable');
        if (!container) return;

        const forms = Storage.getSavedForms();

        if (forms.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Henüz taranmış form yok.</p></div>';
            return;
        }

        const maxItems = Math.max(...forms.map(f => f.scores?.length || 0));

        let html = '<table><thead><tr><th>Form</th>';
        for (let i = 1; i <= maxItems; i++) {
            html += `<th>M${i}</th>`;
        }
        html += '</tr></thead><tbody>';

        forms.forEach(form => {
            const formName = form.name || `Form ${form.id}`;
            html += `<tr data-form-id="${form.id}">`;
            html += `<td class="form-name">${this.escapeHtml(formName)}</td>`;

            const scores = form.scores || [];
            const reverseItems = form.reverseItems || [];

            for (let i = 0; i < maxItems; i++) {
                const score = scores[i] !== undefined ? scores[i] : '-';
                const isReversed = reverseItems.includes(i + 1);
                html += `<td class="result-cell ${isReversed ? 'reversed' : ''}" data-item="${i + 1}">${score}</td>`;
            }
            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    },

    /**
     * Context menu göster
     */
    showContextMenu(e, element) {
        const menu = document.getElementById('contextMenu');
        if (!menu) return;

        // Hangi form/madde seçili
        const formItem = element.closest('.form-item') || element.closest('tr[data-form-id]');
        if (formItem) {
            this.selectedFormId = formItem.dataset.formId || formItem.dataset.id;
        }

        // Menu pozisyonu
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
        menu.classList.remove('hidden');
    },

    /**
     * Context menu gizle
     */
    hideContextMenu() {
        document.getElementById('contextMenu')?.classList.add('hidden');
    },

    /**
     * Context menu aksiyonu işle
     */
    handleContextAction(action) {
        this.hideContextMenu();

        if (!this.selectedFormId) return;

        switch (action) {
            case 'reverse':
                this.reverseScoreForm(this.selectedFormId);
                break;
            case 'delete':
                this.deleteFormResult(this.selectedFormId);
                break;
        }
    },

    /**
     * Formun tüm maddelerini ters puanla
     */
    reverseScoreForm(formId) {
        const forms = Storage.getSavedForms();
        const form = forms.find(f => f.id == formId);

        if (!form) return;

        const settings = Storage.getSettings();
        const likertType = form.likertType || settings.likertType || 5;

        // Tüm puanları ters çevir
        if (form.scores) {
            form.scores = form.scores.map(score => {
                if (score === null || score === undefined || score === 0) return score;
                return likertType + 1 - score;
            });
        }

        // Kaydet
        Storage.updateFormResult(parseInt(formId), { scores: form.scores });

        this.unsavedChanges = true;
        this.loadFormsList();
        this.renderResultsTable();
        this.showStatus('Puanlar ters çevrildi', 'success');
    },

    /**
     * Form sonucunu sil
     */
    deleteFormResult(formId) {
        if (confirm('Bu formu silmek istediğinize emin misiniz?')) {
            Storage.deleteForm(parseInt(formId));
            this.loadFormsList();
            this.renderResultsTable();
            this.updateFormCount();
            this.showStatus('Form silindi', 'success');
        }
    },

    /**
     * Değişiklikleri kaydet
     */
    saveFormChanges() {
        this.showStatus('Değişiklikler kaydedildi', 'success');
        this.unsavedChanges = false;
    }
};

