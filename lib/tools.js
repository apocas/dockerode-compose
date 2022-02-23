module.exports = {
  'getImages': function (recipe) {
    var images = [];
    var serviceNames = Object.keys(recipe.services || []);

    for (var serviceName of serviceNames) {
      if (recipe.services[serviceName].image) {
        images.push(recipe.services[serviceName].image);
      }
    }
    return images;
  },
  'sortServices': function (recipe) {
    var order = [];
    var serviceNames = Object.keys(recipe.services || []);

    while (order.length !== serviceNames.length) {
      for (var serviceName of serviceNames) {
        if (order.indexOf(serviceName) === -1) {
          let depends_on = recipe.services[serviceName].depends_on;
          if (typeof depends_on === "object" && !Array.isArray(depends_on)) {
            // if we are using Long Syntax https://github.com/compose-spec/compose-spec/blob/master/spec.md#long-syntax-1
            // we will need to get keys from object and use them as dependencies
            depends_on = Object.keys(depends_on)
          } 
          insertService(serviceName, depends_on || [], order);
        }
      }
    }
    return order;
  },
  'sortNetworksToAttach': function (networksToAttach) {
    var networksToAttachSorted = [];
    for (let i = 0; i < networksToAttach.length; i++) {
      let networkName = Object.keys(networksToAttach[i]);
      if (i === 0) {
        networksToAttachSorted.push(networksToAttach[i]);
      } else {
        let aux = 0;
        for (let j = 0; j < networksToAttachSorted.length; j++) {
          let networkNameSorted = Object.keys(networksToAttachSorted[j]);
          if (networksToAttachSorted[j][networkNameSorted].priority > networksToAttach[i][networkName].priority) {
            aux += j + 1;
          } else if (networksToAttachSorted[j][networkNameSorted].priority < networksToAttach[i][networkName].priority) {
            aux += j - 1;
          } else {
            aux += j + 1;
          }
        }
        if (aux < 0) aux = 0;
        networksToAttachSorted.splice(aux, 0, networksToAttach[i]);
      }
    }
    return networksToAttachSorted;
  }
}

function insertService(serviceName, depends_on, order) {
  var position = -1;
  for (var serviceDep of depends_on) {
    var p = order.indexOf(serviceDep);
    if (p === -1) return;
    if (p > position) position = p;
  }
  order.splice(position + 1, 0, serviceName);
}
