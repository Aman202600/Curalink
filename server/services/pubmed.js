const axios = require('axios');

const fetchPubMed = async (disease, query) => {
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

        const searchRes = await axios.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi', {
            params: {
                db: 'pubmed',
                term: searchTerm,
                retmode: 'json',
                retmax: 60
            }
        });

        const ids = searchRes.data.esearchresult.idlist;
        if (!ids || ids.length === 0) return [];

        const summaryRes = await axios.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi', {
            params: {
                db: 'pubmed',
                id: ids.join(','),
                retmode: 'json',
                retmax: 100 // Increased for deep retrieval
            }
        });

        const results = Object.values(summaryRes.data.result || {}).filter(item => item.uid).map(item => ({
            source: 'pubmed',
            title: item.title,
            abstract: item.fulljournalname + '. ' + (item.pubdate || ''), // PubMed summary doesn't always have full abstract, but it's enough for a basic fetch
            authors: (item.authors || []).map(a => a.name),
            year: item.pubdate ? parseInt(item.pubdate.split(' ')[0]) : new Date().getFullYear(),
            url: `https://pubmed.ncbi.nlm.nih.gov/${item.uid}/`
        }));

        return results;
    } catch (error) {
        console.error('PubMed Fetch Error:', error);
        return [];
    }
};

module.exports = fetchPubMed;
