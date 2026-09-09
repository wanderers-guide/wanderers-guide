/** Public Mobbin screens visually reviewed on September 9, 2026. Images remain hosted by Mobbin. */
export const mobbinReferences = [
  {
    id: 'browse',
    label: 'Spell list',
    app: 'Ultrahuman',
    screen: 'Breathing Protocols',
    url: 'https://mobbin.com/explore/screens/b7af4af8-5458-485c-887a-bd81ecbbfe01',
    image:
      'https://bytescale.mobbin.com/FW25bBB/image/mobbin.com/prod/file.webp?enc=1.BQnbdJK6.f9YrPXGBOVF58HNh.4Vjs1XREjbCriltDplbGcDq3lMkJdMTMql3kyLvtDa3W7mO8i8My35ROYlJMaBCV78SAWzP-pEWbt9ZP8D0ybhIdXve86Ds_xG7znc30mwiOy-lzYgrND4vC0OxPCrpzpLnrSGQ4bHltLIgbjqTfu9om-4iI1O7rzLA8IVU_2weENRH4uMtNSMaN9DUaNMCD-75YMsaLUubjwt74Jlt0LNB43Yz4RMH5mKjA-YnqqD9y6-KSyqoY99fyckJp5d_ZsoOG2JGKXLIUp2WtKLOg9QP10U1z_QlwoCV-fjS77WMzGq63h0kuNRFkxEcdmkHetCHufkEbdvVTHwFPm8zR3_vRG0OjoPX_Oid4twqzlSRqIqpnc6NFlw',
    title: 'Let spell names lead.',
    observation:
      'A repeated row rhythm and quiet dividers make this catalog easy to scan. Supporting information sits beneath the name.',
    proposal:
      'Use one reading surface. Keep source headings small and align spell names. Prepared uses belong to their individual rows; spontaneous slots belong to the rank heading.',
    caution:
      'The reference has faint secondary text and decorative thumbnails. Our version needs stronger text contrast, and spells do not need an image on every row.',
  },
  {
    id: 'prepare',
    label: 'Daily preparation',
    app: 'Saturn Calendar',
    screen: 'Class List',
    url: 'https://mobbin.com/explore/screens/e9572bcf-347b-4fd3-8680-eda6f59cb547',
    image:
      'https://bytescale.mobbin.com/FW25bBB/image/mobbin.com/prod/file.webp?enc=1.BQnbdJK6.9Iu3BB2ijvB-odpN.X6SUN5USOimTYiLMuhXYu_rwbQhAf5zuUUX7ilgJeM4y5JG0Bya_25-0eSuAGJXkeFKu-pUUvJwO2EqoOgh5eFQZTJK5D9j5hT0D67W9n0oOy7A0I0C5nEtHSkBhTIYmjeI9YGvoV_iIoaBF1hIeBZeOS9ri9-qff7AbiJtsiE2Nfm3d0CupWxt1rJ2sL4gCsFbIZm4gCuJHoeTZM90sVI8QJapTJqMEPYkNduy7bAvzto9Q9r8ywhbDm_0aKisYnBfd9xGfZ8BRaSmpan3Qkn9OIC8vtA5uyPNVKBfTbXAManizqBerZEiS56NDGtGZMjNgfB5bTO0qEbJFc9GTXpk0l0_Q76xHkIirUKFtQx0L_3p0_3LiPA',
    title: 'Give each preparation a place.',
    observation:
      'Filled classes and empty periods occupy the same list. Each position has an obvious edit or add action.',
    proposal:
      'Make daily preparation a full-width slot editor. Keep duplicates, empty slots, and restrictions visible there. Opening a slot leads to a spell picker, with the chosen slot still identified.',
    caution:
      'A long column of empty slots is useful while preparing. During play, summarize empty preparations per rank so they do not dominate the spell list.',
  },
  {
    id: 'cast',
    label: 'Casting sheet',
    app: 'Target',
    screen: 'Item List',
    url: 'https://mobbin.com/explore/screens/3f313f42-170f-4c42-b55b-cd84610db824',
    image:
      'https://bytescale.mobbin.com/FW25bBB/image/mobbin.com/prod/file.webp?enc=1.BQnbdJK6.JZLR6EYEMMP31LAV.7SS4z-2PFsKY3djma6Ts1mn6HXJ1LfTAlTC-_SEI1Cm-w6FWsPlfJP7zlTKcfd1WF9Sx4Gfr8gmAp_pwQpZRhW3zVtlJ7-v-zkN86cxC-wtcmc--OtrcSnGZaJNoMtJuN6sdfw07OaeFOLb88AXEvXXXCCPRI2p_gYyqik4iprjwauzEgrd_WZJZI6prDI5V5CllQ983RBlqdlt2Yq52SriGjmcbvyQKkLr3GsRygG3reqiRAur9XoNgxgA0j9GFIrAawlnHR-lXg0T0ErIaI9AF4W7MlMskUZ8_qqOYCEmwdM3Tfje5bjBydoO-887Gemsv5wB83eX7SaMKgUpVhTgW6A1rCzkfNziwcRPhRc5lnsPxfieEEA',
    title: 'Resolve the choice in one sheet.',
    observation:
      'The list stays inside a contained sheet, with one clear action at the bottom. The background still communicates where you came from.',
    proposal:
      'A spell opens its description and casting choices together. Show the selected source, rank, and cost next to Cast. A staff can offer charges or an eligible slot payment here.',
    caution:
      'This is a placement reference, not a proposal to batch-cast spells. Long descriptions need their own scrolling area while the cost and Cast action stay reachable.',
  },
] as const;
