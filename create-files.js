const fs = require('fs')
const path = require('path')

/**
 * Script to read base.json and create the corresponding file structure
 */
async function createFileStructure() {
	try {
		console.log('Reading base.json...')
		const jsonData = JSON.parse(fs.readFileSync('base.json', 'utf8'))

		console.log('Creating file structure...')

		// Process each entry in the JSON
		for (const [filePath, fileData] of Object.entries(jsonData)) {
			await processEntry(filePath, fileData)
		}

		console.log('File structure created successfully!')
	} catch (error) {
		console.error('Error creating file structure:', error)
	}
}

/**
 * Process a single entry (file or folder)
 */
async function processEntry(filePath, fileData) {
	const { type, name, contents, isBinary } = fileData

	// Skip if it's a folder (we'll create directories as needed when processing files)
	if (type === 'folder') {
		console.log(`Skipping folder: ${filePath}`)
		return
	}

	if (type === 'file') {
		// Ensure the directory exists
		const dirPath = path.dirname(filePath)
		if (dirPath !== '.') {
			await ensureDirectoryExists(dirPath)
		}

		// Write the file
		if (isBinary) {
			// Handle binary files (base64 encoded)
			if (contents) {
				const buffer = Buffer.from(contents, 'base64')
				fs.writeFileSync(filePath, buffer)
				console.log(`Created binary file: ${filePath}`)
			}
		} else {
			// Handle text files
			if (contents) {
				fs.writeFileSync(filePath, contents, 'utf8')
				console.log(`Created file: ${filePath}`)
			} else {
				// Create empty file if no contents
				fs.writeFileSync(filePath, '', 'utf8')
				console.log(`Created empty file: ${filePath}`)
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
		console.log(`Created directory: ${dirPath}`)
	}
}

/**
 * Clean up existing files before creating new structure (optional)
 */
function cleanExistingFiles() {
	console.log('Cleaning up existing files...')

	// Read the JSON to get all file paths
	const jsonData = JSON.parse(fs.readFileSync('base.json', 'utf8'))

	for (const [filePath, fileData] of Object.entries(jsonData)) {
		if (fileData.type === 'file' && fs.existsSync(filePath)) {
			fs.unlinkSync(filePath)
			console.log(`Removed existing file: ${filePath}`)
		}
	}

	// Remove empty directories (in reverse order to handle nested dirs)
	const dirs = new Set()
	for (const [filePath, fileData] of Object.entries(jsonData)) {
		if (fileData.type === 'file') {
			const dirPath = path.dirname(filePath)
			if (dirPath !== '.') {
				dirs.add(dirPath)
			}
		}
	}

	// Sort directories by depth (deepest first)
	const sortedDirs = Array.from(dirs).sort((a, b) => b.split('/').length - a.split('/').length)

	for (const dir of sortedDirs) {
		if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
			fs.rmdirSync(dir)
			console.log(`Removed empty directory: ${dir}`)
		}
	}
}

// Main execution
async function main() {
	const args = process.argv.slice(2)

	if (args.includes('--clean')) {
		cleanExistingFiles()
	}

	await createFileStructure()
}

// Run the script
if (require.main === module) {
	main().catch(console.error)
}

module.exports = { createFileStructure, processEntry, ensureDirectoryExists }
