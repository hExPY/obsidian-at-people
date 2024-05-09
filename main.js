const { App, Editor, EditorSuggest, TFile, Notice, Plugin, PluginSettingTab, Setting } = require('obsidian')

const DEFAULT_SETTINGS = {
	peopleFolder: 'People/',
	// Defaults:
	// peopleFolder: undefined
	// folderMode: undefined
}

const NAME_REGEX = /\/@([^\/]+)\.md$/
const LAST_NAME_REGEX = /([\S]+)$/

const multiLineDesc = (strings) => {
	const descFragment = document.createDocumentFragment();
	strings.map((string, i, arr) => {
		descFragment.appendChild(document.createTextNode(string));
		if (arr.length - 1 !== i) {
			descFragment.appendChild(document.createElement("br"))
		};
	})
	return descFragment;
}

const getPersonName = (filename, settings) => filename.startsWith(settings.peopleFolder)
	&& filename.endsWith('.md')
	&& filename.includes('/@')
	&& NAME_REGEX.exec(filename)?.[1]

module.exports = class AtPeople extends Plugin {
	async onload() {
		await this.loadSettings()
		this.registerEvent(this.app.vault.on('delete', async event => { await this.update(event) }))
		this.registerEvent(this.app.vault.on('create', async event => { await this.update(event) }))
		this.registerEvent(this.app.vault.on('rename', async (event, originalFilepath) => { await this.update(event, originalFilepath) }))
		this.addSettingTab(new AtPeopleSettingTab(this.app, this))
		this.suggestor = new AtPeopleSuggestor(this.app, this.settings)
		this.registerEditorSuggest(this.suggestor)
		this.app.workspace.onLayoutReady(this.initialize)
	}

	async loadSettings() {
		const storedSettings = await this.loadData()
		this.settings = await Object.assign({}, DEFAULT_SETTINGS, storedSettings)
	}

	async saveSettings() {
		await this.saveData(this.settings || DEFAULT_SETTINGS)
	}

	updatePeopleMap = () => {
		this.suggestor.updatePeopleMap(this.peopleFileMap)
	}

	update = async ({ path, deleted, ...remaining }, originalFilepath) => {
		this.peopleFileMap = this.peopleFileMap || {}
		const name = getPersonName(path, this.settings)
		let needsUpdated
		if (name) {
			this.peopleFileMap[name] = path
			needsUpdated = true
		}
		originalFilepath = originalFilepath && getPersonName(originalFilepath, this.settings)
		if (originalFilepath) {
			delete this.peopleFileMap[originalFilepath]
			needsUpdated = true
		}
		if (needsUpdated) this.updatePeopleMap()
	}

	initialize = () => {
		this.peopleFileMap = {}
		for (const filename in this.app.vault.fileMap) {
			const name = getPersonName(filename, this.settings)
			if (name) this.peopleFileMap[name] = filename
		}
		window.setTimeout(() => {
			this.updatePeopleMap()
		})
	}
}

class AtPeopleSuggestor extends EditorSuggest {
	constructor(app, settings) {
		super(app)
		this.settings = settings
	}
	folderModePerPerson = () => this.settings.folderMode === "PER_PERSON"
	folderModePerLastname = () => this.settings.folderMode === "PER_LASTNAME"
	updatePeopleMap(peopleFileMap) {
		this.peopleFileMap = peopleFileMap
	}
	onTrigger(cursor, editor, tFile) {
		let charsLeftOfCursor = editor.getLine(cursor.line).substring(0, cursor.ch)
		let atIndex = charsLeftOfCursor.lastIndexOf('@')
		let query = atIndex >= 0 && charsLeftOfCursor.substring(atIndex + 1)
		if (
			query
			&& !query.includes(']]')
			&& (
				// if it's an @ at the start of a line
				atIndex === 0
				// or if there's a space character before it
				|| charsLeftOfCursor[atIndex - 1] === ' '
			)
		) {
			return {
				start: { line: cursor.line, ch: atIndex },
				end: { line: cursor.line, ch: cursor.ch },
				query,
			}
		}
		return null
	}
	getSuggestions(context) {
		let suggestions = []
		for (let key in (this.peopleFileMap || {}))
			if (key.toLowerCase().startsWith(context.query.toLowerCase()))
				suggestions.push({
					suggestionType: 'set',
					displayText: key,
					context,
				})
		suggestions.push({
			suggestionType: 'create',
			displayText: context.query,
			context,
		})
		return suggestions
	}
	renderSuggestion(value, elem) {
		if (value.suggestionType === 'create') elem.setText('New person: ' + value.displayText)
		else elem.setText(value.displayText)
	}
	selectSuggestion(value) {
		let link
		if (this.folderModePerPerson() && this.settings.useExplicitLinks) {
			link = `[[${this.settings.peopleFolder}@${value.displayText}/@${value.displayText}.md|@${value.displayText}]]`
		}
		else if (this.settings.useExplicitLinks && this.folderModePerLastname()) {
			let lastName = LAST_NAME_REGEX.exec(value.displayText)
			lastName = lastName && lastName[1] && (lastName[1] + '/') || ''
			link = `[[${this.settings.peopleFolder}${lastName}@${value.displayText}.md|@${value.displayText}]]`
		} else if (this.settings.useExplicitLinks && !this.folderModePerLastname()) {
			link = `[[${this.settings.peopleFolder}@${value.displayText}.md|@${value.displayText}]]`
		} else {
			link = `[[@${value.displayText}]]`
		}
		value.context.editor.replaceRange(
			link,
			value.context.start,
			value.context.end,
		)
	}
}

class AtPeopleSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin)
		this.plugin = plugin
	}
	display() {
		const { containerEl } = this
		containerEl.empty()
		new Setting(containerEl)
			.setName('People folder')
			.setDesc('The folder where people files live, e.g. "People/". (With trailing slash.)')
			.addText(
				text => text
					.setPlaceholder(DEFAULT_SETTINGS.peopleFolder)
					.setValue(this.plugin.settings.peopleFolder)
					.onChange(async (value) => {
						this.plugin.settings.peopleFolder = value
						await this.plugin.saveSettings()
					})
			)
		new Setting(containerEl)
			.setName('Explicit links')
			.setDesc('When inserting links include the full path, e.g. [[People/@Bob Dole.md|@Bob Dole]]')
			.addToggle(
				toggle => toggle
				.setValue(this.plugin.settings.useExplicitLinks)
				.onChange(async (value) => {
					this.plugin.settings.useExplicitLinks = value
					await this.plugin.saveSettings()
				})
			)
		new Setting(containerEl)
			.setName('Folder Mode')
			.setDesc(multiLineDesc([
			"Default - Creates a file for every person in the path defined in \"People folder\" e.g. [[People/@Bob Dole|@Bob Dole]]",
			"","Everything non-default requires \"Explicit links\" to be enabled!",
			"Per Person - Creates a folder (and a note with the same name) for every person in the path defined in \"People folder\" e.g. [[People/@Bob Dole/@Bob Dole|@Bob Dole]]",
			"Per Lastname - Creates a folder with the Lastname of the person in the path defined in \"People folder\" e.g. [[People/Dole/@Bob Dole|@Bob Dole]]"
			]))
			.addDropdown(
				dropdown => {
					dropdown.addOption("DEFAULT", "Default");
					dropdown.addOption("PER_PERSON", "Per Person");
					dropdown.addOption("PER_LASTNAME", "Per Lastname");
					dropdown.setValue(this.plugin.settings.folderMode)
					dropdown.onChange(async (value) => {
						this.plugin.settings.folderMode = value
						await this.plugin.saveSettings()
					})
				}
			)
	}
}
