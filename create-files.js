const fs = require('fs')
const path = require('path')
const readline = require('readline')

/**
 * Get project folder name from user input with validation
 */
function getProjectFolderName() {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		})

		const askForFolderName = () => {
			rl.question(
				'📁 Enter project folder name (letters, numbers, hyphens, underscores, and dots only): ',
				(answer) => {
					const folderName = answer.trim()

					// Validate folder name: only letters, numbers, hyphens, underscores, and dots
					const validPattern = /^[a-zA-Z0-9\-_.]+$/

					if (!folderName) {
						console.log('❌ Project folder name cannot be empty!')
						askForFolderName()
					} else if (!validPattern.test(folderName)) {
						console.log(
							'❌ Invalid characters in folder name! Use only letters, numbers, hyphens (-), underscores (_), and dots (.)'
						)
						askForFolderName()
					} else {
						rl.close()
						resolve(folderName)
					}
				}
			)
		}

		askForFolderName()
	})
}

/**
 * Script to read base.json and create the corresponding file structure
 */
async function createFileStructure(projectFolderName) {
	try {
		console.log('📖 Reading base.json...')
		const jsonData = JSON.parse(fs.readFileSync('base.json', 'utf8'))

		console.log(`🏗️  Creating file structure in folder: ${projectFolderName}...`)

		// Ensure project root directory exists
		await ensureDirectoryExists(projectFolderName)

		// Process each entry in the JSON
		for (const [filePath, fileData] of Object.entries(jsonData)) {
			await processEntry(filePath, fileData, projectFolderName)
		}

		console.log(`✅ File structure created successfully in folder: ${projectFolderName}!`)
	} catch (error) {
		console.error('💥 Error creating file structure:', error)
	}
}

/**
 * Process a single entry (file or folder)
 */
async function processEntry(filePath, fileData, projectFolderName) {
	const { type, name, contents, isBinary } = fileData

	// Skip if it's a folder (we'll create directories as needed when processing files)
	if (type === 'folder') {
		console.log(`📁 Skipping folder: ${filePath}`)
		return
	}

	if (type === 'file') {
		// Create the full path inside the project folder
		const fullPath = path.join(projectFolderName, filePath)

		// Ensure the directory exists (including project root or nested dirs)
		const dirPath = path.dirname(fullPath)
		await ensureDirectoryExists(dirPath)

		// Write the file
		if (isBinary) {
			// Handle binary files (base64 encoded)
			if (contents) {
				const buffer = Buffer.from(contents, 'base64')
				fs.writeFileSync(fullPath, buffer)
				console.log(`🖼️  Created binary file: ${fullPath}`)
			}
		} else {
			// Handle text files
			if (contents) {
				fs.writeFileSync(fullPath, contents, 'utf8')
				console.log(`📄 Created file: ${fullPath}`)
			} else {
				// Create empty file if no contents
				fs.writeFileSync(fullPath, '', 'utf8')
				console.log(`📝 Created empty file: ${fullPath}`)
			}
		}
	}
}

/**
 * Ensure directory exists, creating it recursively if needed
 */
async function ensureDirectoryExists(dirPath) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true })
		console.log(`📂 Created directory: ${dirPath}`)
	}
}

/**
 * Clean up existing files before creating new structure (optional)
 */
function cleanExistingFiles(projectFolderName) {
	console.log(`🧹 Cleaning up existing files in folder: ${projectFolderName}...`)

	// Read the JSON to get all file paths
	const jsonData = JSON.parse(fs.readFileSync('base.json', 'utf8'))

	for (const [filePath, fileData] of Object.entries(jsonData)) {
		const fullPath = path.join(projectFolderName, filePath)
		if (fileData.type === 'file' && fs.existsSync(fullPath)) {
			fs.unlinkSync(fullPath)
			console.log(`🗑️  Removed existing file: ${fullPath}`)
		}
	}

	// Remove empty directories (in reverse order to handle nested dirs)
	const dirs = new Set()
	for (const [filePath, fileData] of Object.entries(jsonData)) {
		if (fileData.type === 'file') {
			const dirPath = path.dirname(path.join(projectFolderName, filePath))
			if (dirPath !== projectFolderName) {
				dirs.add(dirPath)
			}
		}
	}

	// Sort directories by depth (deepest first)
	const sortedDirs = Array.from(dirs).sort((a, b) => b.split('/').length - a.split('/').length)

	for (const dir of sortedDirs) {
		if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
			fs.rmdirSync(dir)
			console.log(`📂 Removed empty directory: ${dir}`)
		}
	}
}

// Main execution
async function main() {
	const args = process.argv.slice(2)

	console.log('🚀 Welcome to the Project File Generator!')
	console.log('')

	// Check if base.json exists and is not empty
	try {
		const baseJsonContent = fs.readFileSync('base.json', 'utf8').trim()
		if (!baseJsonContent) {
			console.error('💥 Error: base.json file is empty!')
			console.error('📝 Please ensure base.json contains valid project structure data.')
			process.exit(1)
		}
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.error('💥 Error: base.json file not found!')
			console.error('📝 Please ensure base.json exists in the current directory.')
		} else {
			console.error('💥 Error reading base.json:', error.message)
		}
		process.exit(1)
	}

	// Get project folder name from user
	const projectFolderName = await getProjectFolderName()

	if (args.includes('--clean')) {
		cleanExistingFiles(projectFolderName)
	}

	await createFileStructure(projectFolderName)
}

// Run the script
if (require.main === module) {
	main().catch(console.error)
}

module.exports = { createFileStructure, processEntry, ensureDirectoryExists, getProjectFolderName }
