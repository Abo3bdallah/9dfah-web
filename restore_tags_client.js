document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Supabase
    const checkSupabase = setInterval(async () => {
        if (typeof supabase !== 'undefined') {
            clearInterval(checkSupabase);
            await restoreTags();
        }
    }, 500);
});

async function restoreTags() {
    console.log('Attempting to restore tags...');
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.log('No user logged in.');
        return;
    }

    // Check admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        console.log('User is not admin.');
        return;
    }

    const tagsToRestore = [
        { name: "للجوال والكمبيوتر", color: "#3b82f6" },
        { name: "للكمبيوتر", color: "#6b7280" },
        { name: "للجوال", color: "#10b981" },
        { name: "أداة", color: "#9ca3af" },
        { name: "متجر", color: "#8b5cf6" },
        { name: "بلس", color: "#fbbf24" },
        { name: "مهكر", color: "#ef4444" },
        { name: "مدفوع", color: "#10b981" },
        { name: "حصري", color: "#ec4899" },
        { name: "جديد", color: "#f87171" },
        { name: "تحديث", color: "#60a5fa" },
        { name: "شرح", color: "#fcd34d" },
        { name: "هام", color: "#dc2626" }
    ];

    let restoredCount = 0;

    for (const tag of tagsToRestore) {
        // Check if exists
        const { data: existing } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tag.name)
            .maybeSingle();

        if (!existing) {
            const { error } = await supabase
                .from('tags')
                .insert([tag]);
            
            if (!error) {
                console.log(`Restored: ${tag.name}`);
                restoredCount++;
            } else {
                console.error(`Failed to restore ${tag.name}:`, error);
            }
        } else {
            console.log(`Skipped (exists): ${tag.name}`);
        }
    }

    if (restoredCount > 0) {
        alert(`تم استعادة ${restoredCount} تصنيف بنجاح! يمكنك الآن إدارتها من لوحة التحكم.`);
        // Reload to show them
        location.reload();
    } else {
        console.log('All tags already exist.');
    }
}
