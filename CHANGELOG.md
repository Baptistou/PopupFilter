# PopupFilter 4.0 - CHANGELOG

**version 4.0 (09/06/2018)**
- Fix some minor issues.
- Add new design in browserAction popup and Settings page.
- Add new features to action menu in browserAction popup and Settings page.
- Add information slideshow to "About" block in Settings page.
- Add light & dark themes.
- Add user interface persistence.
- Update some i18n translations.
- Remove footer from Settings page.
- Code and performance improvements.

**version 3.3 (14/04/2018)**
- Fix issue with invalid tab id on browser.tabs.onAttached on Firefox Quantum 57-60.
- Fix some icon font issue on Windows 10.
- Fix CSS for private tab list in Settings page.
- Prevent some potential issues in functions.js.
- Code and performance improvements.

**version 3.2 (25/03/2018)**
- Fix CSP sandbox invalid option.
- Add browserAction title translation for Firefox Android.
- CSS responsive improvements for large screens.
- Icon font improvements for Windows and Linux.
- Code and performance improvements.

**version 3.1 (04/01/2018)**
- Fix compatibility issue with Chromium PDF Viewer Plugin not working with CSP sandbox.
- Fix compatibility issue with Firefox not opening Google links with CSP sandbox.

**version 3.0 (02/01/2018)**
- Fix issue with Settings page which could not open again if its tab url was modified.
- Fix issue with browser.tabs.onRemoved event not firing in some case on Firefox Quantum.
- Add internationalization with i18n API.
- Add French, Italian and Spannish translations.
- Add a new option in Settings page that permits to apply Content Security Policy to restrict popups and improve browser safety.
- Modify browser.tabs.create() behaviour from default position to "next to current" for restoring tabs.

**version 2.0 (22/11/2017)**
- Stable release :)
- Add options_ui to manifest.json.
- Add Restore Last button to browserAction popup.
- Add duplicate tab grouping in Settings page.
- Add different color to private tab list in Settings page.
- Modify "About" block in Settings page.

**version 1.9 (08/11/2017)**
- Fix issue with Port.onDisconnect event not firing for browserAction popup when window is closed.
- Fix issue with tab count badge not updating in some case.
- Fix compatibility issue with browserAction.setBadgeBackgroundColor() on Chrome.
- Fix compatibility issue with Tab.favIconUrl not supported on Firefox Android.
- Add blocking web requests for popups to improve browser safety.
- Add current mode to browserAction title for better visibility on Firefox Android.
- Modify the appearance of browserAction popup.
- Code and performance improvements.

**version 1.8 (25/10/2017)**
- Fix issue with closetab() function which could close browser window when new tab popups close automatically on Firefox.
- Add a new option in Settings page that permits to show/hide tab count badge in the browserAction button (no Firefox Android support).
- Add tab count badge in the browserAction button in Normal Mode.
- Add favicons to tab lists in Settings page (no Firefox Android support).
- CSS responsive improvements for mobile display.
- Code and performance improvements.

**version 1.7 (05/10/2017)**
- Fix issue with Settings page not updating on tab close in some case.
- Fix issue with browser.tabs.onCreated event not firing on previous session restore on Firefox.
- Fix issue with Port.onDisconnect event not firing on unload when window is closed.
- Modify tab list sorting for Settings page.
- Code and performance improvements.

**version 1.6 (28/09/2017)**
- Fix issue with Settings page not updating on window close in some case.
- Add "About" block in Settings page.
- Modify the appearance of Settings page with two sections Overview and Settings.

**version 1.5 (21/09/2017)**
- Fix issue with "about:blank" popups not closing sometimes in Blocking Mode.
- Fix compatibility issue with browserAction popup focus on Firefox Android 58-.
- Code and performance improvements.

**version 1.4 (15/09/2017)**
- Fix compatibility issue with webNavigation.onCreatedNavigationTarget API on Chrome when popup focus option is set to foreground.
- Fix compatibility issue with browserAction popup on Firefox Android when Settings tab is created.
- Code and performance improvements.

**version 1.3 (07/09/2017)**
- Add a new option in Settings page that permits to control popup focus on opening.
- PopupFilter icon and badge improvements.
- Code and performance improvements.

**version 1.2 (05/09/2017)**
- Fix compatibility issue with browser.windows API on Firefox Android.
- Fix compatibility issue with browser.browserAction API on Firefox Android.
- PopupFilter icon improvements such as dynamic change on browserAction popup and settings page.

**version 1.1 (03/09/2017)**
- Fix issue with Firefox "about:config" when browser.tabs.closeWindowWithLastTab is set to false.
- Add new icons according to PopupFilter modes and add badge on toolbar.
- Code and performance improvements.

**version 1.0 (31/08/2017)**
- First version :)
- Note: As Firefox Android APIs are currently under development by Mozilla, the full support for Android version will come in future updates.

*Designed by Baptiste Thémine*
