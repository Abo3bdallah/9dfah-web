    document.getElementById('btn-add-ad').onclick = () => {
        showFormModal('إضافة إعلان جديد', [
            { label: 'عنوان الإعلان', name: 'title', type: 'text' },
            { label: 'رابط الصورة', name: 'imageUrl', type: 'text' },
            { label: 'رابط التوجيه (اختياري)', name: 'linkUrl', type: 'text' },
            { label: 'تكرار الظهور', name: 'frequency', type: 'select', value: 'once', options: [
                { value: 'once', text: 'مرة واحدة (Once)' },
                { value: 'always', text: 'دائماً (Always)' }
            ]}
        ], async (data) => {
            if (!data.title || !data.imageUrl) throw new Error('العنوان والصورة مطلوبان');
            const { error } = await supabase.from('ads').insert([{ 
                title: data.title, 
                image_url: data.imageUrl, 
                link_url: data.linkUrl,
                frequency: data.frequency,
                is_active: true
            }]);
            if (error) throw error;
            loadAdsData();
        });
    };