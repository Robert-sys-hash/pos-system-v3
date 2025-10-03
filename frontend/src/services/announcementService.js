import api from './api';

const announcementService = {
  // Pobierz wszystkie ogłoszenia
  async getAnnouncements() {
    try {
      const response = await api.get('/api/announcements');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd pobierania ogłoszeń');
    }
  },

  // Dodaj nowe ogłoszenie (admin)
  async createAnnouncement(announcementData) {
    try {
      const response = await api.post('/api/announcements', announcementData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd tworzenia ogłoszenia');
    }
  },

  // Usuń ogłoszenie (admin)
  async deleteAnnouncement(announcementId) {
    try {
      const response = await api.delete(`/api/announcements/${announcementId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd usuwania ogłoszenia');
    }
  },

  // Pobierz komentarze do ogłoszenia
  async getComments(announcementId) {
    try {
      const response = await api.get(`/api/announcements/${announcementId}/comments`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd pobierania komentarzy');
    }
  },

  // Dodaj komentarz do ogłoszenia
  async addComment(announcementId, commentData) {
    try {
      const response = await api.post(`/api/announcements/${announcementId}/comments`, commentData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Błąd dodawania komentarza');
    }
  }
};

export default announcementService;
