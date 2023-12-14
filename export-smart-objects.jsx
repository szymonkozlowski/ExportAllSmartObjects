//v0.1
//Export All Smart Objects.jsx
//This script exports all visible smart objects from the document as PNG and PSD. 
//In case of bugs or feature requests message me at s.kozlowski@brandnewgalaxy.com

/*

@@@BUILDINFO@@@ Export All Smart Objects.jsx 1.0

*/

#target photoshop

//debug flag
var debug=0;

// Create a new window (a dialog)
var dialog = new Window("dialog", "User Preferences");

// Add a static text to the dialog
dialog.add("statictext", undefined, "Export All Smart Objects v1.0");

// Add a static text to the dialog
dialog.add("statictext", undefined, "Select your preferences:");

// Add checkboxes, left-aligned and checked by default
var checkbox1 = dialog.add("checkbox", undefined, "Export as PNG");
checkbox1.alignment = 'left';
checkbox1.value = true;

var checkbox2 = dialog.add("checkbox", undefined, "Export as PSD");
checkbox2.alignment = 'left';
checkbox2.value = true;

var checkbox3 = dialog.add("checkbox", undefined, "Include hidden Smart Objects in export");
checkbox3.alignment = 'left';
checkbox3.value = true;

// Add a button to confirm the selection
var confirmButton = dialog.add("button", undefined, "Confirm", {name: "ok"});

// Variables to store the checkbox values
var checkboxValues = {
    prefExportPNG: true,
    prefExportPSD: true,
    prefIncludeHidden: true
};

// Function to update the checkbox values
function updateCheckboxValues() {
    checkboxValues.prefExportPNG = checkbox1.value;
    checkboxValues.prefExportPSD = checkbox2.value;
    checkboxValues.prefIncludeHidden = checkbox3.value;
}

// Button click event handler
confirmButton.onClick = function() {
    updateCheckboxValues();
    dialog.close();
    if (debug==1) {
    alert("Option 1: " + checkboxValues.prefExportPNG + "\nOption 2: " + checkboxValues.prefExportPSD + "\nOption 3: " + checkboxValues.prefIncludeHidden);        
    }
};

// Display the dialog
dialog.show();



//Return smart objects count, incl. hidden layers
function countSmartObjects(layer) {
    var count = 0;

    if (layer.typename == "ArtLayer") {
        // Check if the layer is a smart object
        if (layer.kind == LayerKind.SMARTOBJECT) {
            count = 1;
        }
    } else if (layer.typename == "LayerSet") {
        // This is a group layer; recurse into its layers
        for (var j = 0; j < layer.layers.length; j++) {
            count += countSmartObjects(layer.layers[j]);
        }
    }

    return count;
}

function getTotalSmartObjectCount(doc) {
    var total = 0;

    for (var i = 0; i < doc.layers.length; i++) {
        total += countSmartObjects(doc.layers[i]);
    }

    return total;
}

function findAllLayers(layer, allLayers) {
    if (layer.typename === "ArtLayer") {
        allLayers.push(layer);
    } else if (layer.typename === "LayerSet") {
        for (var j = 0; j < layer.layers.length; j++) {
            findAllLayers(layer.layers[j], allLayers);
        }
    }
}

function checkDuplicateLayerNames(doc) {
    var allLayers = [];
    var layerNameCount = {};
    var duplicateNames = [];

    // Gather all layers
    for (var i = 0; i < doc.layers.length; i++) {
        findAllLayers(doc.layers[i], allLayers);
    }

    // Count layer names of smart objects only
    for (var i = 0; i < allLayers.length; i++) {
        var layer = allLayers[i];
        if (layer.kind === LayerKind.SMARTOBJECT) {
            var name = layer.name;
            layerNameCount[name] = (layerNameCount[name] || 0) + 1;
        }
    }

    // Find duplicates
    for (var name in layerNameCount) {
        if (layerNameCount[name] > 1) {
            duplicateNames.push(name);
        }
    }

    // Alert if duplicates are found
    if (duplicateNames.length > 0) {
        alert("Duplicate layer names found! \n Only one of these layers will be exported: " + duplicateNames.join(",\n"));
    } else {
        return;
    }
}

//Recursive processing function
function processLayer(layer) {
    //Skip hidden layers when proper option is set
    if (!layer.visible && checkboxValues.prefIncludeHidden==false) {
        return;
    }

    //Chech if the layer is locked variables
    var wasLocked = layer.allLocked;
    var wasLayerSetLocked = false;

    function isInsideHiddenGroup(layer) {
        var parent = layer.parent;
        while (parent && parent.typename == "LayerSet") {
            if (!parent.visible) return true;
            parent = parent.parent;
        }
        return false;
    }
    var wasHidden = !layer.visible && !isInsideHiddenGroup(layer);

    // Unlock the layer if it's locked
    if (wasLocked) {
        if (layer.typename == "ArtLayer") {
            layer.allLocked = false;
        } else if (layer.typename == "LayerSet") {
            wasLayerSetLocked = layer.layers.every(function (subLayer) { return subLayer.allLocked; });
            if (wasLayerSetLocked) {
                layer.layers.forEach(function (subLayer) { subLayer.allLocked = false; });
            }
        }
    }

    //main function process
    if (layer.typename == "ArtLayer") {
        // Process individual layer
        if (layer.kind == LayerKind.SMARTOBJECT) {
            exportSmartLayer(layer)
        }
    } else if (layer.typename == "LayerSet") {
        // This is a group layer; recurse into its layers
        for (var j = 0; j < layer.layers.length; j++) {
            processLayer(layer.layers[j]);
        }
    }

    // Re-lock the layer if it was originally locked
    if (wasLocked) {
        if (layer.typename == "ArtLayer") {
            layer.allLocked = true;
        } else if (layer.typename == "LayerSet" && wasLayerSetLocked) {
            layer.layers.forEach(function (subLayer) { subLayer.allLocked = true; });
        }
    }
    if (wasHidden) {
        layer.visible = false;

    }
}

// Recursive processing function
function exportSmartObjects() {
    var doc = app.activeDocument;

    for (var i = 0; i < doc.layers.length; i++) {
        processLayer(doc.layers[i]);
    }


}

//Function to check the status of the layer and process it
// Check if the layer is a smart object
var processedCount=0;
function exportSmartLayer(layer) {
    var doc = app.activeDocument;
    // Make the layer active
    app.activeDocument.activeLayer = layer;

    // Open the smart object
    app.runMenuItem(stringIDToTypeID("placedLayerEditContents"));

    // Export to PNG
    if (checkboxValues.prefExportPNG==true) {
        try {
            exportAsPNG(doc, layer.name);
        } catch (e) {
            // Handle the error
            alert("Error saving PNG\n" + layer.name + "\n Check for illegal characters in file name, such as exclamation marks, brackets etc." + e);
        }        
    }

    // Save as PSD
    if (checkboxValues.prefExportPSD==true) {
        try {
            saveAsPSD(doc, layer.name);
        } catch (e) {
            // Handle the error
            alert("Error saving PSD\n" + layer.name + "\n Check for illegal characters in file name, such as exclamation marks, brackets etc." + e);
        }        
    }
    
    // Close the smart object
    app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);

    if (debug==1) {
        alert(layer.name)
    }
    processedCount++;
}


// Function to export as PNG
function exportAsPNG(doc, layerDocumentName) {
    var exportOptions = new ExportOptionsSaveForWeb();
    exportOptions.format = SaveDocumentType.PNG;
    var file = new File(doc.path + '/' + layerDocumentName + '.png');
    app.activeDocument.exportDocument(file, ExportType.SAVEFORWEB, exportOptions);
}

// Function to save as PSD
function saveAsPSD(doc, layerDocumentName) {
    var saveOptions = new PhotoshopSaveOptions();
    var file = new File(doc.path + '/' + layerDocumentName + '.psd');
    app.activeDocument.saveAs(file, saveOptions, true, Extension.LOWERCASE);
}

// Check SO count
var smartObjectCount = getTotalSmartObjectCount(app.activeDocument);

//Check for duplicates
checkDuplicateLayerNames(app.activeDocument);

// Run the main function
exportSmartObjects();

if (processedCount==smartObjectCount) {
    alert("Export finished\n" + smartObjectCount + " Smart Objects found, \n" + processedCount +" Smart Objects exported.");
} else {
    alert("Export finished\nMismatch between number objects found and processed. \n" + smartObjectCount + " Smart Objects found, \n" + processedCount +" Smart Objects exported. \nMost likely some of the layers are hidden, any you deselected export of hidden layers.");
}
