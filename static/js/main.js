/* _______________________
* Ressources utilisées :
* https://reactjs.org/tutorial/tutorial.html
* https://codepen.io/jeffleu/pen/JRzyPZ
* https://medium.com/tinyso/how-to-create-game-2048-in-javascript-reactjs-react-native-4588bfd136c9
* https://github.com/siarhiej-h/2048/tree/dev
* https://www.youtube.com/watch?v=xAvFYEXxWKg
* https://blog.wolfram.com/2014/05/09/2048/
* https://stackoverflow.com/questions/35762351/correct-way-to-handle-conditional-styling-in-react/51183104
* https://www.codegrepper.com/code-examples/javascript/fetch+post+json
* http://www-ens.iro.umontreal.ca/~levestev/ift3225-E21/demo8/loadReact.js
* _______________________
 */
/*
 * Détermine le style (couleur de police et de fond) d'une cellule
 * individuelle en fonction de sa valeur (props "value")
 */


function Cell(props) {
    let number = props.value === 0 ? null : props.value;
    let powerOf2 = Math.log(props.value) / Math.log(2);
    let fontColors = ["#776e65", "#f9f6f2"];
    let backgroundColors = ["#c3bbaf", "#eee4da", "#ede0c8", "#f2b179", "#f59563", "#f67c5f", "#f65e3b", "#edcf72", "#edcc61", "#edc850", "#edc53f", "#edc22e"];
    let currentColor = props.value <= 4 ? fontColors[0] : fontColors[1];
    let currentBack = props.value === 0 ? backgroundColors[0] : backgroundColors[powerOf2];
    return (
        <div class="cell" style={{ color: currentColor, backgroundColor: currentBack }}>
            {number}
        </div>
    );
}

/*
 * Table component : Passe un props appellé "value" à Cell et affiche
 * un tableau (props table) composés de cellules
 */
class Table extends React.Component {
    render() {
        let table = this.props.table;
        return (
            <div class="table">
                {table.map((row) => {
                    return (
                        <row style={{ display: "table-row" }}>
                            {row.map((cell) => (
                                <Cell value={cell} />
                            ))}
                        </row>
                    );
                })}
            </div>
        );
    }
}
/*
 * Game component : Applique toute la logique du jeu
 * Passe un props "table" du tableau actuel à Table
 */
class Game extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            table: [],
            dimension: 0,
            won: false,
            lost: false,
            moves: 0,
            username:'',
            best: ''
        };
        this.getName();
        this.keyDownHandler = this.keyDownHandler.bind(this);
        document.addEventListener("keydown", this.keyDownHandler);

    }
    /*
     * Get le username du joueur
     */
    getName() {
        $.ajax({
                type: 'GET',
                dataType: "json",
                url: '/get_name',
            })
            .then(data => this.setState({
                username: data
            }))
    }

    /*
     * Ajouter le meilleur score dans la base de données
     */
   postScore() {
    let username = this.state.username;
    let data = {
        "username": username,
        "moves": this.state.moves
    };
    console.log(JSON.stringify(data))
    $.ajax({
        url:'/scores',
        data: JSON.stringify(data),
        contentType: 'application/',
        type: 'POST',
        success: function(response) {
            console.log(response);
            },
        error: function(error) {
            console.log(error);
        }
    });
    }

    /*
     * Get le meilleur score de la base de données
     */

    bestScore() {
        $.ajax({
                type: 'GET',
                dataType: "json",
                url: '/api/get_best_score',
            })
            .then(data => this.setState({
                best: data
            }))

        document.getElementById("bestScore").innerText = "Best : " + this.state.best;
    }

    /*
     * Placer une valeur (2 ou 4) au hasard sur une des cases libres
     */
     addRandom(table) {
         let i, j;
         do {
             i = Math.floor(table.length * Math.random());
             j = Math.floor(table.length * Math.random());
         } while (table[i][j] !== 0);
         Math.random() < 0.5 ? table[i][j] = 2 : table[i][j] = 4;
         return table;
     }
    /*
     * Générer un tableau de taille N x N
     */
    generateTable(changeDim) {
        let select = document.getElementById("dimensions");
        let dimension = select.options[select.selectedIndex].value;
        let table = [];
        let table1, table2;
        let i = 0;
        while (i < dimension) {
            let j = 0;
            table[i] = [];
            while (j < dimension) {
                table[i][j] = 0;
                j++;
            }
            i++;
        }
        //Placer 2 tuiles au hasard sur le tableau
        table1 = this.addRandom(table);
        table2 = this.addRandom(table1);
        this.setState({
            table: table2,
            dimension: dimension,
            won: false,
            lost: false,
            moves: 0,
        });
    }
    /*
     * Détecter les situations de terminaison du jeu
     */
    checkStatus() {
        let i = 0;
        while (i < this.state.table.length) {
            let j = 0;
            while (j < this.state.table.length) {
                if (this.state.table[i][j] === 16) {
                    this.setState({ won: true });
                    alert("Congratulations, You won!");
                    return;
                }
                j++;
            }
            i++;
        }
        let currentTable = this.state.table;
        this.right(currentTable);
        if (this.equal(currentTable, this.state.table)) {
            this.setState({ table: currentTable });
            this.left(currentTable);
        } else {
            this.setState({ table: currentTable });
            return;
        }
        if (this.equal(currentTable, this.state.table)) {
            this.setState({ table: currentTable });
            this.up(currentTable);
        } else {
            this.setState({ table: currentTable });
            return;
        }
        if (this.equal(currentTable, this.state.table)) {
            this.setState({ table: currentTable });
            this.down(currentTable);
        } else {
            this.setState({ table: currentTable });
            return;
        }
        if (this.equal(currentTable, this.state.table)) {
            this.setState({ table: currentTable });
        } else {
            this.setState({ table: currentTable });
            return;
        }
        this.setState({ lost: true });
        alert("Oops, Game over!");
    }
    /*
     * Détecte les mouvements du clavier et déplace
     * les cases en fonction de ceux-ci
     */
    keyDownHandler(e) {

        if (!this.state.won && !this.state.lost) {
            if (e.keyCode === 37) {
                //left
                let tempTable = this.state.table;
                this.left(tempTable);
                if (!this.equal(tempTable, this.state.table)) {
                    let nextTable = this.addRandom(this.state.table);
                    this.setState({
                        table: nextTable,
                        moves: this.state.moves + 1,
                    });
                    this.checkStatus();
                }
            } else if (e.keyCode === 39) {
                //right
                let tempTable = this.state.table;
                this.right(tempTable);
                if (!this.equal(tempTable, this.state.table)) {
                    let nextTable = this.addRandom(this.state.table);
                    this.setState({
                        table: nextTable,
                        moves: this.state.moves + 1,
                    });
                    this.checkStatus();
                }
            } else if (e.keyCode === 38) {
                //up
                let tempTable = this.state.table;
                this.up(tempTable);
                if (!this.equal(tempTable, this.state.table)) {
                    let nextTable = this.addRandom(this.state.table);
                    this.setState({
                        table: nextTable,
                        moves: this.state.moves + 1,
                    });
                    this.checkStatus();
                }
            } else if (e.keyCode === 40) {
                //down
                let tempTable = this.state.table;
                this.down(tempTable);
                if (!this.equal(tempTable, this.state.table)) {
                    let nextTable = this.addRandom(this.state.table);
                    this.setState({
                        table: nextTable,
                        moves: this.state.moves + 1,
                    });
                    this.checkStatus();
                }
            }
        }
        if (this.state.won){
            this.postScore();
        }
    }
    /*
     * Déplacement + fusionnement des cases
     */
    left(table) {
        let i = 0;
        this.reposition(table, "shift left");
        let leftShifted = this.state.table;
        while (i < table.length) {
            let j = 0;
            while (j < table.length) {
                if (leftShifted[i][j] !== 0 && leftShifted[i][j] === leftShifted[i][j + 1]) {
                    leftShifted[i][j] += leftShifted[i][j];
                    leftShifted[i][j + 1] = 0;
                }
                j++;
            }
            i++;
        }
        this.reposition(leftShifted, "shift left");
        leftShifted = this.state.table;
        this.setState({ table: leftShifted });
    }
    right(table) {
        this.reposition(table, "mirror");
        let reversed = this.state.table;
        this.left(reversed);
        let moved = this.state.table;
        this.reposition(moved, "mirror");
        let restored = this.state.table;
        this.setState({ table: restored });
    }
    up(table) {
        this.reposition(table, "rotate right");
        let rotated = this.state.table;
        this.right(rotated);
        let moved = this.state.table;
        this.reposition(moved, "rotate left");
        let restored  = this.state.table;
        this.setState({ table: restored });
    }
    down(table) {
        this.reposition(table, "rotate right");
        let rotated = this.state.table;
        this.left(rotated);
        let moved = this.state.table;
        this.reposition(moved, "rotate left");
        let restored = this.state.table;
        this.setState({ table: restored });
    }
    /*
     * Repositionne les cases
     * rotate right tourne le tableau 90 degrés vers la droite
     * rotate left tourne le tableau 90 degrés vers la gauche
     * mirror inverse le tableau
     * shift left déplace les cases vers la gauche
     */
    reposition(table, movement) {
        let i = 0;
        let newTable = [];
        while (i < table.length) {
            let j = 0;
            let jSh = 0;
            newTable[i] = [];
            while (j < table.length) {
                if (movement === "rotate right") {
                    newTable[i][j] = table[table.length - 1 - j][i];
                } else if (movement === "rotate left") {
                    newTable[i][j] = table[j][table.length - 1 - i];
                } else if (movement === "mirror") {
                    newTable[i][j] = table[i][table.length - 1 - j];
                } else if (movement === "shift left") {
                    newTable[i][j] = 0;
                    if (table[i][j] !== 0) {
                        newTable[i][jSh] = table[i][j];
                        jSh++;
                    }
                }
                j++;
            }
            i++;
        }
        this.setState({table : newTable});
    }
    /*
     * Retourne true si les tables sont équivalentes
     */
    equal(table1, table2) {
        let i = 0;
        while (i < table1.length) {
            let j = 0;
            while (j < table1.length) {
                if (table1[i][j] !== table2[i][j]) {
                    return false;
                }
                j++;
            }
            i++;
        }
        return true;
    }
    componentDidMount(){
        setInterval(e=>this.bestScore(),500);

    }
   /*
    * Passe un props appellé "table" à Table et y affecte le tableau du jeu
    actuel
    */
   render() {
       let currentTable = this.state.table;

     return (
         <div class="container">
             <div class="row justify-content-md-center">
                 <div class="col-md-auto">
                     <p> Choose dimensions </p>
                     <select id="dimensions">
                         <option value=""> ---- </option>
                         <option value="2">2 x 2</option>
                         <option value="3">3 x 3</option>
                         <option value="4">4 x 4</option>
                         <option value="5">5 x 5</option>
                         <option value="6">6 x 6</option>
                         <option value="7">7 x 7</option>
                         <option value="8">8 x 8</option>
                         <option value="9">9 x 9</option>
                         <option value="10">10 x 10</option>
                     </select>
                     <br></br>
                     <br></br>
                     <button class="btn btn-secondary" type="button" onClick={() => {
                         this.generateTable();
                     }}> Start Game
                     </button>
                 </div>
                 <div class="col-md-auto">
                     <h1>2048</h1>
                     <Table table ={currentTable} />
                 </div>
                 <div class="col-md-auto">
                     <span class = "badge rounded-pill bg-info" > Moves : {this.state.moves} </span>
                     <br/>
                     <span id = "bestScore" className="badge rounded-pill bg-info"> Best : {this.state.best} </span>
                 </div>
             </div>
         </div>
     );
 }
}
ReactDOM.render( < Game/> , document.getElementById("root"));
