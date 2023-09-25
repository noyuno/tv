window.addEventHandler('load', () => {
  var screen = 0;
  var screens = ['status-block', 'weather-block' ];
  const nextScreen = () => {
    document.querySelector('#' + screens[screen]).style.display = 'none';

  };
});

