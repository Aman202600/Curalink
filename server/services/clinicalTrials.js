const axios = require('axios');

const fetchClinicalTrials = async (disease, location) => {
    try {
        // 🧪 Broad search: prioritizing disease, location will be ranked later
        const searchTerm = (disease || 'General Medical Condition');
        const response = await axios.get('https://clinicaltrials.gov/api/v2/studies', {
            params: {
                'query.term': searchTerm,
                'pageSize': 80
            }
        });

        return (response.data.studies || []).map(item => {
            const protocol = item.protocolSection || {};
            const idModule = protocol.identificationModule || {};
            return {
                source: 'clinicaltrials',
                title: idModule.officialTitle || idModule.briefTitle || 'Unknown Clinical Trial',
                abstract: protocol.descriptionModule?.briefSummary || 'No summary available',
                authors: [protocol.sponsorCollaboratorsModule?.leadSponsor?.name || 'Unknown Sponsor'],
                year: protocol.statusModule?.startDateStruct?.date ? parseInt(protocol.statusModule.startDateStruct.date.split(' ')[0]) : null,
                url: `https://clinicaltrials.gov/study/${protocol.identificationModule.nctId}`,
                status: protocol.statusModule?.overallStatus,
                eligibility: protocol.eligibilityModule?.eligibilityCriteria,
                location: protocol.contactsLocationsModule?.locations?.[0]?.facility,
                contact: protocol.contactsLocationsModule?.centralContacts?.[0]?.email || protocol.contactsLocationsModule?.centralContacts?.[0]?.phone
            };
        });
    } catch (error) {
        console.error('ClinicalTrials Fetch Error:', error);
        return [];
    }
};

module.exports = fetchClinicalTrials;
