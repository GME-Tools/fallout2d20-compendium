Hooks.on('init', () => {
  if(typeof Babele !== 'undefined') {
      Babele.get().register({
          module: 'fallout2d20-compendium',
          lang: 'fr',
          dir: 'lang/packs/fr'
      });
      Babele.get().register({
        module: 'fallout2d20-compendium',
        lang: 'en',
        dir: 'lang/packs/en'
    });
  }
});