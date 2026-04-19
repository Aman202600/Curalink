const axios = require('axios');

const fetchOpenAlex = async (disease, query) => {
    try {
        // 🧪 Refined Search Term: Avoid redundancy
        const dSafe = (disease || 'General').toLowerCase();
        const qSafe = (query || '').toLowerCase();
        
        let searchTerm = dSafe;
        if (qSafe && !qSafe.includes(dSafe)) {
            searchTerm = `${dSafe} ${qSafe}`;
        } else if (qSafe) {
            searchTerm = qSafe;
        }

        const response = await axios.get('https://api.openalex.org/works', {
            params: {
                search: searchTerm,
                per_page: 50
            }
        });

        return (response.data.results || []).map(item => ({
            source: 'openalex',
            title: item.display_name || item.title || 'Untitled Research',
            abstract: item.abstract_inverted_index ? 'Abstract available' : '', 
            authors: (item.authorships || []).map(a => a.author?.display_name || 'Anonymous'),
            year: item.publication_year,
            url: item.doi || item.id
        }));
    } catch (error) {
        console.error('OpenAlex Fetch Error:', error);
        return [];
    }
};

module.exports = fetchOpenAlex;
