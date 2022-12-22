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