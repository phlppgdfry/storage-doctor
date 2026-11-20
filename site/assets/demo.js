// Plays examples/showcase/regression.cast, a genuine ~45 s terminal recording made with `npm run demo:record`.
AsciinemaPlayer.create('assets/regression.cast', document.getElementById('sd-player'), {
  fit: 'width', terminalFontSize: '13px', idleTimeLimit: 2, poster: 'npt:0:12', theme: 'monokai',
});
