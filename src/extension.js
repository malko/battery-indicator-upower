/* extension.js
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
/* exported init */
import GObject from 'gi://GObject'
import St from 'gi://St'
import Gio from 'gi://Gio'
import Clutter from 'gi://Clutter'

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { settingsDef } from './settingsDef.js';
import * as SettingsManager from './utils/SettingsManager.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

let settingsManager

const Ornament = {
	NONE: 0,
	DOT: 1,
	CHECK: 2,
	HIDDEN: 3,
}

/** spwan async upower -d command an return promise of the result */
const spawnAsync = async (cmd) => new Promise((resolve, reject) => {
	try {
		let proc = Gio.Subprocess.new(
			cmd,
			Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
		)
		proc.communicate_utf8_async(null, null, (proc, res) => {
			try {
				let [, stdout, stderr] = proc.communicate_utf8_finish(res)
				if (proc.get_successful()) {
					resolve(stdout)
				} else {
					reject(stderr)
				}
			} catch (e) {
				logError(e)
				throw e
			}
		})
	} catch (e) {
		logError(e)
		throw e
	}
})

/** parse output of upower -d */
const upowerParser = (output) => {
	const items = String(output).split('\n\n')
		.filter(_ => {
			return _.match(/^Device:/)     // only devices
				&& _.match(/^\s*serial:/m)   // remove if no serial
		})
		.map(deviceStr => {
			const lines = deviceStr.split('\n').map(line => {
				const groups = line.match(/^\s*(?<prop>[^:]+):\s*(?<val>.*)$/)?.groups
				if (!groups)
					return { prop: 'type', val: line.trim() }
				let { prop, val } = groups
				prop = prop.replace(/[\s-]/g, '_')
				switch (prop) {
					// case 'percentage':
					// 	val = parseInt(val, 10)
					// 	break
					case 'icon_name':
						val = val.replace(/'([^']+)'/, '$1')
						break
					default:
						val = val === 'no' ? false : val === 'yes' ? true : val
						break
				}
				return { prop, val }
			})
			return lines.reduce((acc, cur) => { acc[cur.prop] = cur.val; return acc }, {})
		})

	return items
}
const deviceTypeIcons = {
	'gaming-input': 'input-gaming',
	'mouse': 'input-mouse',
	'touchpad': 'input-mouse',
	'keyboard': 'input-keyboard',
	'pda': 'pda',
	'printer': 'printer',
	'scanner': 'scanner',
	'table': 'input-tablet',
	'headset': 'audio-headset',
	'headphones': 'audio-headphones',
	'camera': 'camera-photo',
	'video': 'video-display',
	'monitor': 'video-display',
	'speakers': 'audio-speakers',
	'bluetooth-generic': 'bluetooth-active',
	'audio-device': 'audio-x-generic'
}
/** return desired icon regarding upower */
const getDeviceIcon = (device, useSymbolic) => {
	const { type, model, icon_name } = device
	const suffix = useSymbolic ? '-symbolic' : ''
	if (model.match(/keyboard/i))
		return deviceTypeIcons.keyboard + suffix
	if (model.match(/mouse/i))
		return deviceTypeIcons.mouse + suffix
	if (model.match(/Sony PLAYSTATION\(R\)3 Controller Motion Sensors/i))
		return deviceTypeIcons['gaming-input'] + suffix
	if (type in deviceTypeIcons)
		return deviceTypeIcons[type] + suffix
	return useSymbolic ? icon_name : icon_name.replace(/-symbolic$/, '')
}

const makeMenuItem = (params) => {
	const { label, icon, secondaryIcon, onActivate, ornament = Ornament.HIDDEN, labelStyle, ..._params } = params || {}
	const item = icon
		? new PopupMenu.PopupImageMenuItem(label, icon, _params || undefined)
		: new PopupMenu.PopupMenuItem(label, _params || undefined)
	item.setOrnament(ornament) // hidden Ornament
	onActivate && item.connect('activate', onActivate)
	labelStyle && item.label.set_style(labelStyle)
	secondaryIcon && !icon.match(/^battery/) && item.insert_child_at_index(new St.Icon({
		icon_name: secondaryIcon,
		style_class: 'popup-menu-icon'
	}), 2)
	return item
}

const Indicator = GObject.registerClass(class Indicator extends PanelMenu.Button {
	constructor(extension) {
		super()
		this._extension = extension
	}

	_init() {
		super._init(0.0, 'Battery indicator')

		this._indicatorsBoxLayout = new St.BoxLayout({ style_class: 'battery-indicator-boxlayout' })

		// add a loading icon while initializing
		this.add_child(this._indicatorsBoxLayout)
		this._indicatorsBoxLayout.add_child(new St.Icon({
			icon_name: 'emblem-synchronizing-symbolic',
			style_class: 'system-status-icon',
		}))

		this.addRefreshMenuItem()
		this._refreshTimeout = null
	}

	async refreshIndicator() {
		// clear previous refresh timer
		this._refreshTimeout && clearTimeout(this._refreshTimeout)

		// get fresh datas
		let stdout
		try {
			stdout = await spawnAsync(['upower', '-d'])
		} catch (e) {
			e instanceof Uint8Array && (e = BiteArray.toString(e))
			logError('Error:', e)
			throw new Error(e)
		}
		const devices = upowerParser(stdout)

		// update display
		this.removeChilds()
		const hideEmpty = settingsManager.get('hideempty-menuitem')
		const hiddenDevices = settingsManager.get('hidden-devices')
			.filter((serial) => devices.find(d => d?.serial === serial) ? true : false)
		const displayedDevices = devices.filter(d => !hiddenDevices.includes(d.serial))

		// ensure at least one device is displayed if not set to hide empty
		if (!displayedDevices.length && !hideEmpty) {
			displayedDevices.push(devices[0])
		}

		displayedDevices.length && this.addDevicesIndicatorItems(displayedDevices)

		// refresh menu items
		this.addDevicesMenuItems(devices)
		this.addCommonMenuItems()

		// restart refresh timer
		this._refreshTimeout = setTimeout(() => {
			this.refreshIndicator()
		}, (settingsManager.get("refresh-interval") || 300) * 1000)
	}

	removeChilds() {
		const container = this._indicatorsBoxLayout
		let child = container.get_first_child()
		while (child) {
			container.remove_child(child)
			child.destroy()
			child = container.get_first_child()
		}
		this.menu.removeAll()
	}

	addDevicesIndicatorItems(devices) {
		const useSymbolic = settingsManager.get('symbolic-icons')
		const container = this._indicatorsBoxLayout
		devices.length && devices.forEach((device, id) => {
			const icon_name = getDeviceIcon(device, useSymbolic)
			const colorStyle = device.state === 'charging' ? 'color:yellow;' : ''
			const fontStyle = device.percentage.match(/ignored/) ? 'font-style:italic;' : ''
			const icon = new St.Icon({
				icon_name,
				style_class: 'system-status-icon',
				style: `margin-right:0;${colorStyle}${id ? '' : 'margin-left:0px;' // remove margin-left for first Icon
					}`
			})
			const label = new St.Label({
				text: parseInt(device.percentage, 10) + '%',
				style_class: 'battery-indicator-label',
				style: `${colorStyle}${fontStyle}`,
				y_align: Clutter.ActorAlign.CENTER
			})
			container.add_child(icon)
			container.add_child(label)
		})
	}

	addDevicesMenuItems(devices) {
		const useSymbolic = settingsManager.get('symbolic-icons')
		const hiddenDevices = settingsManager.get('hidden-devices')
		devices.length && devices.forEach((device, id) => {
			const { serial, model, state } = device
			const isHiddenDevice = hiddenDevices.includes(serial)
			const menuItem = makeMenuItem({
				label: `${model} (${state || 'unknown'}) ${parseInt(device.percentage, 10) + '%'}`,
				icon: getDeviceIcon(device, useSymbolic),
				secondaryIcon: device.icon_name,
				labelStyle: device.percentage.match(/ignored/) ? 'font-style:italic;' : '',
				ornament: Ornament[isHiddenDevice ? 'NONE' : 'CHECK']
				,
				onActivate: () => {
					const hiddenDevices = settingsManager.get('hidden-devices').filter(s => s !== serial)
					isHiddenDevice || hiddenDevices.push(serial)
					settingsManager.set('hidden-devices', hiddenDevices)
				}
			})
			this.menu.addMenuItem(menuItem)
		})
	}

	addCommonMenuItems() {
		settingsManager.get('refresh-menuitem') && this.addRefreshMenuItem()
		settingsManager.get('settings-menuitem') && this.addSettingsMenuItem()
	}

	addRefreshMenuItem() {
		this.menu.addMenuItem(makeMenuItem({
			label: _('Refresh now'),
			icon: 'emblem-synchronizing-symbolic',
			onActivate: () => {
				clearTimeout(this._refreshTimeout)
				this._refreshTimeout = setTimeout(() => this.refreshIndicator(), 500)
			}
		}))
	}

	addSettingsMenuItem() {
		this.menu.addMenuItem(makeMenuItem({
			label: _('Settings'),
			icon: 'preferences-other',
			onActivate: () => this._extension.openPreferences?.()
		}))
	}

	destroy() {
		this._refreshTimeout && clearTimeout(this._refreshTimeout)
		super.destroy()
	}

})

export default class BatteryExtension extends Extension {
	constructor(metadata) {
		super(metadata);
		this._uuid = metadata.uuid
	}

	enable() {
		const indicator = new Indicator(this)
		this._indicator = indicator
		settingsManager = SettingsManager.init(
			this,
			'org.gnome.shell.extensions.battery-indicator-upower',
			settingsDef
		)._startListening()
		indicator.refreshIndicator().catch(e => { logError(e, 'refresh in enable') })
		this._settingObserver = settingsManager.addChangeObserver(() => {
			indicator.refreshIndicator()
		})
		Main.panel.addToStatusArea(this._uuid, this._indicator)
	}

	disable() {
		if (this._settingObserver) {
			this._settingObserver?.()
			this._settingObserver = null
		}
		this._indicator?.destroy()
		settingsManager.destroy()
		this._indicator = null
		settingsManager = null
	}

}
