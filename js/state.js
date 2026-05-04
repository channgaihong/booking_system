export const State = {
      systemUser: null, 
      guestId: 'guest_' + Math.random().toString(36).substr(2, 9), 
      activeTab: 'booking',
      adminTab: 'bookings',
      selectedDate: new Date().toISOString().split('T')[0],
      selectedRoomId: null,
      bookingModalSlots: [], 
      roomFilterType: 'all',
      roomSearchKeyword: '',
      adminBookingPage: 1,
      adminBookingPerPage: 10,
      adminBookingSearchKeyword: '',
      selectedSlots: [],
      bookingViewMode: 'day',
      db: { users: [], rooms: [], timeSlots: [], holidays: [], bookings: [], authCodes: [], classes: [], settings: [] }
    };