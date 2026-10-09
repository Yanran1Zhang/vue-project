import {defineStore} from 'pinia';

export const useEventStore = defineStore('event', {
  state: () => ({
    neName: '',
    eventId: '',
    neOrigin: '',
  }),
});
