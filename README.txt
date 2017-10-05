PopupFilter version 1.7 by Baptiste Thémine

Prevents intempestive opening of popups from website scripts.
PopupFilter is a simple and lightweight add-on designed with WebExtensions API and compatible with Firefox, Chrome and Opera.
It's easy to switch between 3 different available modes :
Normal Mode : Allow the opening of new tabs and new windows. (normal behaviour)
Confirm Mode : Ask before opening and displaying content of new tabs/windows.
Blocking Mode : Block all new tabs/windows opened by links or scripts.
PopupFilter contains also a settings webpage which enumerates open/on hold/blocked tabs and permits to do quick actions such as :
close tab, display blocked content of tab, restore blocked tab, go to tab (double click).
The role of this add-on is to block/filter every tabs opened by web scrips or links (which can be hidden in front of page sometimes),
even with context menu "Open in...".
However, you can still open links in new tab normally by drag & drop links on nav bar or by switching temporarily to Normal Mode.

--------------------------------------------------------------------------------

PopupFilter version 1.7 par Baptiste Thémine

Empêche les ouvertures intempestives de popups déclenchées par des scripts web.
PopupFilter est une extension simple et légère développée à l'aide de l'API WebExtensions et compatible avec les navigateurs Firefox, Chrome et Opera.
Il est facile de basculer entre 3 différents modes disponibles :
Normal Mode : Autorise l'ouverture de nouveaux onglets et nouvelles fenêtres (comportement normal).
Confirm Mode : Demande une confirmation avant d'ouvrir et d'afficher le contenu de nouveaux onglets/fenêtres.
Blocking Mode : Bloque tous les nouveaux onglets/fenêtres ouvert(e)s par des liens ou des scripts.
PopupFilter contient également une page de paramètres où sont listés les onglets ouverts, en attente de confirmation ou bloqués, et permet d'effectuer des actions rapides telles que :
fermer un onglet, afficher le contenu bloqué d'un onglet, restaurer un onglet bloqué, aller vers cet onglet (double click).
Le rôle de cette extension est de bloquer/filtrer tous les onglets ouverts par des scripts web ou des liens (qui peuvent parfois être cachés devant la page),
même avec le menu contextuel "Ouvrir dans...".
Cependant, il est toujours possible d'ouvrir les liens normalement par drag & drop sur la barre de navigation ou en basculant temporairement en mode Normal.

--------------------------------------------------------------------------------

PopupFilter updates :
* version 1.7
- Fix issue with Settings page not updating on tab close in some case.
- Fix issue with browser.tabs.onCreated event not firing on previous session restore on Firefox.
- Fix issue with browser.runtime.port.onDisconnect event not firing on unload when window is closed.
- Modify tab list sorting for Settings page
- Code and performance improvements.

* version 1.6 (28/09/2017)
- Modify the appearance of Settings page with two sections Overview and Settings.
- Add "About" block in Settings page.
- Fix issue with Settings page not updating on window close in some case.

* version 1.5 (21/09/2017)
- Fix issue with about:blank popups not closing sometimes in Blocking mode.
- Fix compatibility issue with Settings page focus on Firefox Android.
- Code and performance improvements.

* version 1.4 (15/09/2017)
- Fix compatibility issue with browser.webNavigation.onCreatedNavigationTarget API on Chrome when popup focus option is set to foreground.
- Fix compatibility issue with browserAction popup on Firefox Android when Settings tab is created.
- Code and performance improvements.

* version 1.3 (07/09/2017)
- Add a new option in Settings page that permits to control popup focus on opening.
- PopupFilter icon and badge improvements.
- Code and performance improvements.

* version 1.2 (05/09/2017)
- PopupFilter icon improvements such as dynamic change on browserAction popup and settings page.
- Fix compatibility issue with browser.windows API on Firefox Android.
- Fix compatibility issue with browser.browserAction API on Firefox Android.

* version 1.1 (03/09/2017)
- Add new icons according to PopupFilter modes and add badge on toolbar.
- Fix issue with Firefox about:config when browser.tabs.closeWindowWithLastTab is set to false.
- Code and performance improvements.

* version 1.0 (31/08/2017)
First version :)
Note: As Firefox Android APIs are currently under development by Mozilla, the full support for Android version will come in future updates.
