/* pref.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
const {Adw, GLib, Gtk, Gio} = imports.gi

// It's common practice to keep GNOME API and JS imports in separate blocks
const ExtensionUtils = imports.misc.extensionUtils
const Me = ExtensionUtils.getCurrentExtension()


/**
 * Like `extension.js` this is used for any one-time setup like translations.
 *
 * @param {ExtensionMeta} meta - An extension meta object, described below.
 */
function init(meta) {

}

/**
 * This function is called when the preferences window is first created to fill
 * the `Adw.PreferencesWindow`.
 *
 * This function will only be called by GNOME 42 and later. If this function is
 * present, `buildPrefsWidget()` will never be called.
 *
 * @param {Adw.PreferencesWindow} window - The preferences window
 */
function fillPreferencesWindow(window) {
	const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.battery-indicator-upower')
	const commonInputParams = {
		valign: Gtk.Align.CENTER,
	}
	const prefsPage = new Adw.PreferencesPage({
		name: 'general',
		title: 'General',
		icon_name: 'preferences-other-symbolic',
	})
	window.add(prefsPage)

	const prefsGroup = new Adw.PreferencesGroup({
		title: 'Global Settings',
		// description: `Configure ${Me.metadata.name} behaviour`,
	})
	prefsPage.add(prefsGroup)
	//-- automatic refresh interval
	const refreshIntervalEntry = new Gtk.SpinButton({
		...commonInputParams,
		adjustment: new Gtk.Adjustment({
			lower: 5,
			upper: 86400,
			step_increment: 1,
			page_increment: 1,
			page_size: 0
		}),
		digits: 0,
	})
	const refreshIntervalRow = new Adw.ActionRow({
		title: 'Refresh interval',
		subtitle: 'Number of seconds to wait before automatic refresh of info.',
		activatable_widget: refreshIntervalEntry
	})
	prefsGroup.add(refreshIntervalRow)
	refreshIntervalEntry.set_value(settings.get_uint('refresh-interval'))
	refreshIntervalEntry.connect('value-changed', () => {
		settings.set_uint('refresh-interval', refreshIntervalEntry.get_value())
	})
	refreshIntervalRow.add_suffix(refreshIntervalEntry)

	//-- allow manual refresh
	const refreshItemRow = new Adw.ActionRow({
		title: 'Allow manual refresh',
		subtitle: 'Whether to add a menu item to manually refresh indicators info.',
	})
	prefsGroup.add(refreshItemRow)
	const refreshItemSwitch = new Gtk.Switch(commonInputParams)
	refreshItemRow.add_suffix(refreshItemSwitch)
	refreshItemRow.set_activatable_widget(refreshItemSwitch)

	settings.bind(
		'refresh-menuitem',
		refreshItemSwitch,
		'active',
		Gio.SettingsBindFlags.DEFAULT
	)
}