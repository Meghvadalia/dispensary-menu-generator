export type Connection =
  | { pos: 'dutchie'; authCode: string }
  | {
      pos: 'flowhub';
      clientId: string;
      apiKey: string;
      locationId: string;
      locationName: string;
    };

export type PosId = Connection['pos'];

export const POS_LABELS: Record<PosId, string> = {
  dutchie: 'Dutchie',
  flowhub: 'Flowhub',
};
