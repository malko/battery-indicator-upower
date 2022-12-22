/* SettingsManager.js
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
const ExtensionUtils = imports.misc.extensionUtils;

class SettingsManagerClass {
	constructor(settingId, settingsDef) {
		// main listener
		this._observer = null
		// user regisetered listeners
		this._observers = {}
		this._settingsDefArray = settingsDef
		this._settingsDefDic   = settingsDef.reduce((def, cur) => {
			def[cur.key] = cur
			return def
		}, {})
		this._gsettings = ExtensionUtils.getSettings(settingId)
	}

	_startListening() {
		if (!this._observer) {
			this._observer = this._gsettings.connect('changed', () => {
				Object.entries(this._observers).forEach(([prop, handlersMap]) => {
					handlersMap.forEach(handler => handler(prop !== '/'? this.get(prop) : undefined))
				})
			})
		}
		return this
	}

	_stopListening() {
		if (this._observer) {
			this._gsettings.disconnect(this._observer)
			this._clearUserChangeObservers()
		}
		this._observer = null
		return this
	}

	_clearUserChangeObservers() {
		Object.values(this._observers).forEach(map => map.clear())
		return this
	}

	destroy() {
		// unbind cahnge observers
		this._stopListening()
		// explicitly remove internal pointers
		this._gsettings = null
		this._settings = null
		this._settingsDefArray = null
		this._settingsDefDic = null
		this._observers = null
	}

	_getPropType(prop) {
		if (! (prop in this._settingsDefDic))
			throw new Error(`Trying to access unknown setting property "${prop}"`)
		return this._settingsDefDic[prop].type
	}

	get(prop) {
		const type = this._getPropType(prop)
		return this._gsettings[`get_${type}`](prop)
	}

	set(prop, value) {
		const type = this._getPropType(prop)
		this._gsettings[`set_${type}`](prop, value)
		return this
	}

	/**
	 * if prop is ommitted then observe any settings change
	 * return a function to stop observing
	 * @param {*} prop
	 * @param {*} handler
	 * @returns
	 */
	addChangeObserver(prop, handler) {
		if (!handler && prop instanceof Function) {
			handler = prop
			prop = '/'
		}
		if (!this._observers[prop]) {
			this._observers[prop] = new Map()
		}
		const map = this._observers[prop]
		const key = Symbol()
		map.set(key, handler)
		return () => map.delete(key)
	}
}

var init = (...args) => new SettingsManagerClass(...args)