
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkGenres() {
    const { data, error } = await supabase
        .from('mangas')
        .select('title, genres')
        .or('title.ilike.%Yankee%,title.ilike.%Takane%,title.ilike.%Nè nè%,title.ilike.%Dù thế nào%');

    if (error) {
        console.error(error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

checkGenres();
