/**
 * Storage Module - LocalStorage Yönetimi
 * Formları, ayarları ve şablonları cihazda saklar
 */

const Storage = {
    KEYS: {
        FORMS: 'omr_saved_forms',
        SETTINGS: 'omr_settings',
        TEMPLATES: 'omr_templates',
        REVERSE_ITEMS: 'omr_reverse_items',
        SUB_SCALES: 'omr_sub_scales'
    },

    // ===== Ayarlar =====
    getSettings() {
        const defaults = {
            itemCount: 21,
            likertType: 5,
            autoSaveDelay: 5,
            scoreDirection: 'low_to_high',
            reverseItems: []
        };

        try {
            const saved = localStorage.getItem(this.KEYS.SETTINGS);
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch (e) {
            console.error('Ayarlar yüklenirken hata:', e);
            return defaults;
        }
    },

    saveSettings(settings) {
        try {
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
        } catch (e) {
            console.error('Ayarlar kaydedilirken hata:', e);
        }
    },

    // ===== Ters Maddeler =====
    getReverseItems() {
        try {
            const saved = localStorage.getItem(this.KEYS.REVERSE_ITEMS);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    },

    setReverseItems(items) {
        try {
            localStorage.setItem(this.KEYS.REVERSE_ITEMS, JSON.stringify(items));
        } catch (e) {
            console.error('Ters maddeler kaydedilirken hata:', e);
        }
    },

    // ===== Alt Boyutlar =====
    getSubScales() {
        try {
            const saved = localStorage.getItem(this.KEYS.SUB_SCALES);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    },

    setSubScales(scales) {
        try {
            localStorage.setItem(this.KEYS.SUB_SCALES, JSON.stringify(scales));
        } catch (e) {
            console.error('Alt boyutlar kaydedilirken hata:', e);
        }
    },

    // ===== Taranmış Formlar =====
    getSavedForms() {
        try {
            const saved = localStorage.getItem(this.KEYS.FORMS);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    },

    saveForm(formData) {
        const forms = this.getSavedForms();
        const settings = this.getSettings();

        const newForm = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            likertType: settings.likertType,
            itemCount: settings.itemCount,
            reverseItems: settings.reverseItems || [],
            ...formData
        };

        forms.unshift(newForm);

        try {
            localStorage.setItem(this.KEYS.FORMS, JSON.stringify(forms));
        } catch (e) {
            console.error('Form kaydedilirken hata:', e);
        }

        return newForm;
    },

    deleteForm(formId) {
        const forms = this.getSavedForms();
        const filtered = forms.filter(f => f.id !== formId);
        localStorage.setItem(this.KEYS.FORMS, JSON.stringify(filtered));
    },

    updateFormResult(formId, updates) {
        const forms = this.getSavedForms();
        const index = forms.findIndex(f => f.id === formId);
        if (index !== -1) {
            forms[index] = { ...forms[index], ...updates };
            localStorage.setItem(this.KEYS.FORMS, JSON.stringify(forms));
            return true;
        }
        return false;
    },

    updateAllForms(updatedForms) {
        try {
            localStorage.setItem(this.KEYS.FORMS, JSON.stringify(updatedForms));
            return true;
        } catch (e) {
            console.error('Formlar güncellenirken hata:', e);
            return false;
        }
    },

    clearAllForms() {
        localStorage.removeItem(this.KEYS.FORMS);
    },

    getFormCount() {
        return this.getSavedForms().length;
    },

    // ===== Form Şablonları =====
    getTemplates() {
        try {
            const saved = localStorage.getItem(this.KEYS.TEMPLATES);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    },

    saveTemplate(template) {
        const templates = this.getTemplates();
        const newTemplate = {
            id: Date.now(),
            createdAt: new Date().toISOString(),
            ...template
        };
        templates.push(newTemplate);
        localStorage.setItem(this.KEYS.TEMPLATES, JSON.stringify(templates));
        return newTemplate;
    },

    deleteTemplate(templateId) {
        const templates = this.getTemplates();
        const filtered = templates.filter(t => t.id !== templateId);
        localStorage.setItem(this.KEYS.TEMPLATES, JSON.stringify(filtered));
    },

    // ===== CSV Export (Legacy) =====
    exportAllAsCSV() {
        const forms = this.getSavedForms();
        if (forms.length === 0) return null;

        // İlk formdan madde sayısını al
        const maxItems = Math.max(...forms.map(f => f.scores?.length || 0));

        // Header oluştur
        let headers = ['ID', 'Tarih', 'Saat', 'Likert'];
        for (let i = 1; i <= maxItems; i++) {
            headers.push(`M${i}`);
        }
        headers.push('Toplam', 'Geçerli', 'Hata');

        // CSV satırları
        let csvContent = headers.join(',') + '\n';

        forms.forEach((form, idx) => {
            const date = new Date(form.timestamp);
            let row = [
                idx + 1,
                date.toLocaleDateString('tr-TR'),
                date.toLocaleTimeString('tr-TR'),
                form.likertType || 5
            ];

            // Puanlar
            const scores = form.scores || [];
            for (let i = 0; i < maxItems; i++) {
                row.push(scores[i] !== undefined ? scores[i] : '');
            }

            row.push(form.total || 0);
            row.push(form.validCount || 0);
            row.push(form.errorCount || 0);

            csvContent += row.join(',') + '\n';
        });

        return csvContent;
    },

    // ===== Excel (XLSX) Export =====
    exportToExcel() {
        const forms = this.getSavedForms();
        if (forms.length === 0) {
            alert('Dışa aktarılacak form yok!');
            return false;
        }

        // SheetJS kontrolü
        if (typeof XLSX === 'undefined') {
            console.error('SheetJS yüklenmedi!');
            alert('Excel kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.');
            return false;
        }

        try {
            // Maksimum madde sayısını al
            const maxItems = Math.max(...forms.map(f => f.scores?.length || 0));

            // Veri dizisi oluştur
            const data = [];

            // Header satırı - Sadece Form Adı ve Maddeler
            const header = ['Form Adı'];
            for (let i = 1; i <= maxItems; i++) {
                header.push(`M${i}`);
            }
            data.push(header);

            // Form verileri - Sadece ad ve puanlar
            forms.forEach((form) => {
                const formName = form.name || `Form ${form.id}`;
                const row = [formName];

                // Puanlar
                const scores = form.scores || [];
                for (let i = 0; i < maxItems; i++) {
                    row.push(scores[i] !== undefined && scores[i] > 0 ? scores[i] : '');
                }

                data.push(row);
            });

            // Worksheet oluştur
            const ws = XLSX.utils.aoa_to_sheet(data);

            // Sütun genişlikleri
            const colWidths = [
                { wch: 5 },   // No
                { wch: 12 },  // Tarih
                { wch: 10 },  // Saat
                { wch: 10 },  // Likert
            ];
            for (let i = 0; i < maxItems; i++) {
                colWidths.push({ wch: 6 });
            }
            colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 12 });
            ws['!cols'] = colWidths;

            // Workbook oluştur
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sonuçlar');

            // Dosya adı
            const fileName = `Likert_OMR_${new Date().toISOString().split('T')[0]}.xlsx`;

            // İndir
            XLSX.writeFile(wb, fileName);

            return true;
        } catch (error) {
            console.error('Excel export hatası:', error);
            alert('Excel dosyası oluşturulurken hata: ' + error.message);
            return false;
        }
    },

    // ===== CSV İndir (Legacy) =====
    downloadCSV() {
        const csv = this.exportAllAsCSV();
        if (!csv) {
            alert('Dışa aktarılacak form yok!');
            return;
        }

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `omr_sonuclar_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }
};
