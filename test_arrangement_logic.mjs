let DEBUG = false;

let i_am_concerned



// Loop to test a full scenario :
let addressed_tile = 5
let nbr_tiles_concerned = 7
// let arrangement = "NORMAL_VERTICAL" ; let arrangement_params = { nbr_of_colums:4, nbr_of_rows:4}
// let arrangement = "SERPENTINE_HORIZONTAL" ; let arrangement_params = {i_have_normal_direction_hor:true, nbr_of_columns:4}
let arrangement = "SERPENTINE_VERTICAL" ; let arrangement_params = {i_have_normal_direction_ver:true, nbr_of_colums:4, nbr_of_rows:4}


for (let i = 0; i < 20; i++) {
    i_am_concerned = amIConcerned(i, addressed_tile, nbr_tiles_concerned,arrangement, arrangement_params)
    console.log('TEST : i_am_concerned for '+i+' : '+i_am_concerned)
}




function amIConcerned(my_id, addressed_tile_id, nbr_tiles_concerned, arrangement, arrangement_params = {}){

    if(my_id === addressed_tile_id){
        return true
    }

    let concerned_tile_id = addressed_tile_id

    if(arrangement === "NORMAL_HORIZONTAL") //OK
    {

        let tiles_between_us = my_id - addressed_tile_id

        return (tiles_between_us >= 0 && tiles_between_us < nbr_tiles_concerned)

    }

    else if(arrangement === "SERPENTINE_HORIZONTAL") //OK
    {

        let i_have_normal_direction = arrangement_params.i_have_normal_direction_hor // for this arrangement, as a tile, I need to know if I am on a row that has the normal-direction (same direction as in normal arrangement)
        let nbr_of_columns = arrangement_params.nbr_of_columns
        let my_row_first_id = my_id - (my_id % nbr_of_columns)
        let his_row_first_id = concerned_tile_id - (concerned_tile_id % nbr_of_columns)
        let rows_between_us = (my_row_first_id - his_row_first_id) / nbr_of_columns
        let concerned_tile_has_normal_direction = (rows_between_us % 2 === 0 ? i_have_normal_direction : (!i_have_normal_direction))
        let full_rows_between_us = rows_between_us - 1
        let tiles_on_his_row = ( concerned_tile_has_normal_direction ? nbr_of_columns - (concerned_tile_id % nbr_of_columns) : (concerned_tile_id % nbr_of_columns) + 1 )
        let tiles_on_my_row = ( i_have_normal_direction ? (my_id % nbr_of_columns) + 1 : nbr_of_columns - (my_id % nbr_of_columns) )
        let tiles_between_us = (full_rows_between_us * nbr_of_columns) + tiles_on_his_row + tiles_on_my_row - 1

        if(DEBUG)
        {
            console.log('i_have_normal_direction: ', i_have_normal_direction)
            console.log('nbr_of_columns: ', nbr_of_columns)
            console.log('my_row_first_id: ', my_row_first_id)
            console.log('his_row_first_id: ', his_row_first_id)
            console.log('my_id: ', my_id)
            console.log('concerned_tile_id: ', concerned_tile_id)
            console.log('nbr_tiles_concerned: ', nbr_tiles_concerned)
            console.log('rows_between_us: ', rows_between_us)
            console.log('concerned_tile_has_normal_direction: ', concerned_tile_has_normal_direction)
            console.log('full_rows_between_us: ', full_rows_between_us)
            console.log('tiles_on_his_row: ', tiles_on_his_row)
            console.log('tiles_on_my_row: ', tiles_on_my_row)
            console.log('tiles_between_us: ', tiles_between_us)
        }


        return (tiles_between_us >= 0 && tiles_between_us < nbr_tiles_concerned)

    }

    else if(arrangement === "SERPENTINE_VERTICAL") //OK
    {

        let i_have_normal_direction = arrangement_params.i_have_normal_direction_ver // for this arrangement, as a tile, I need to know if I am on a row that has the normal-direction (same direction as in normal arrangement)
        let nbr_of_columns = arrangement_params.nbr_of_colums
        let nbr_of_rows = arrangement_params.nbr_of_rows
        let my_col_first_id = my_id % nbr_of_columns
        let his_col_first_id = concerned_tile_id % nbr_of_columns
        let cols_between_us = my_col_first_id - his_col_first_id
        let concerned_tile_has_normal_direction = (cols_between_us % 2 === 0 ? i_have_normal_direction : (!i_have_normal_direction))
        let full_cols_between_us = cols_between_us - 1
        let tiles_on_his_col = ( concerned_tile_has_normal_direction ? nbr_of_rows - ((concerned_tile_id - his_col_first_id)/nbr_of_columns) : ((concerned_tile_id - his_col_first_id)/nbr_of_columns) + 1 )
        let tiles_on_my_col = ( i_have_normal_direction ? ((my_id - my_col_first_id)/nbr_of_columns) + 1 : nbr_of_rows - ((my_id - my_col_first_id)/nbr_of_columns) )
        let tiles_between_us = (full_cols_between_us * nbr_of_rows) + tiles_on_his_col + tiles_on_my_col - 1

        if(DEBUG)
        {
            console.log('i_have_normal_direction: ', i_have_normal_direction)
            console.log('nbr_of_columns: ', nbr_of_columns)
            console.log('my_col_first_id: ', my_col_first_id)
            console.log('his_col_first_id: ', his_col_first_id)
            console.log('my_id: ', my_id)
            console.log('concerned_tile_id: ', concerned_tile_id)
            console.log('nbr_tiles_concerned: ', nbr_tiles_concerned)
            console.log('cols_between_us: ', cols_between_us)
            console.log('concerned_tile_has_normal_direction: ', concerned_tile_has_normal_direction)
            console.log('full_cols_between_us: ', full_cols_between_us)
            console.log('tiles_on_his_col: ', tiles_on_his_col)
            console.log('tiles_on_my_col: ', tiles_on_my_col)
            console.log('tiles_between_us: ', tiles_between_us)
        }

        return (tiles_between_us >= 0 && tiles_between_us < nbr_tiles_concerned)

    }

    else if(arrangement === "NORMAL_VERTICAL") //OK
    {

        let nbr_of_colums = arrangement_params.nbr_of_colums
        let nbr_of_rows = arrangement_params.nbr_of_rows
        let my_col_first_id = my_id % nbr_of_colums
        let his_col_first_id = concerned_tile_id % nbr_of_colums
        let cols_between_us = my_col_first_id - his_col_first_id
        let full_cols_between_us = cols_between_us - 1
        let tiles_on_his_col = nbr_of_rows - ((concerned_tile_id - his_col_first_id)/nbr_of_colums)
        let tiles_on_my_col = ((my_id - my_col_first_id)/nbr_of_colums) + 1
        let tiles_between_us = (full_cols_between_us * nbr_of_rows) + tiles_on_his_col + tiles_on_my_col -1

        if(DEBUG){
            console.log('my_id: ', my_id)
            console.log('concerned_tile_id: ', concerned_tile_id)
            console.log('nbr_tiles_concerned: ', nbr_tiles_concerned)
            console.log('nbr_of_colums: ', nbr_of_colums)
            console.log('nbr_of_rows: ', nbr_of_rows)
            console.log('my_col_first_id: ', my_col_first_id)
            console.log('his_col_first_id: ', his_col_first_id)
            console.log('cols_between_us: ', cols_between_us)
            console.log('full_cols_between_us: ', full_cols_between_us)
            console.log('tiles_on_his_col: ', tiles_on_his_col)
            console.log('tiles_on_my_col: ', tiles_on_my_col)
            console.log('tiles_between_us: ', tiles_between_us)
        }


        return (tiles_between_us >= 0 && tiles_between_us < nbr_tiles_concerned)

    }


    else if(arrangement === "SERPENTINE_HORIZONTAL_UNOPTIMIZED"){

        let i_have_normal_direction = arrangement_params.i_have_normal_direction // for this arrangement, as a tile, I need to know if I am on a row that has the normal-direction (same direction as in normal arrangement)
        let nbr_of_columns = arrangement_params.nbr_of_columns
        let my_row_first_id = my_id - (my_id % nbr_of_columns)

        console.log('nbr_of_columns: '+nbr_of_columns)
        console.log('my_row_first_id: '+my_row_first_id)

        let concerned_tile_id = addressed_tile_id
        console.log('concerned_tile_id: '+concerned_tile_id)

        for (let i = 1; i < nbr_tiles_concerned; i++) {

            let his_row_first_id = concerned_tile_id - (concerned_tile_id % nbr_of_columns)
            let rows_between_us = (my_row_first_id - his_row_first_id) / nbr_of_columns
            let concerned_tile_has_normal_direction = (rows_between_us % 2 === 0 ? i_have_normal_direction : (!i_have_normal_direction))

            if((concerned_tile_has_normal_direction && concerned_tile_id % nbr_of_columns === (nbr_of_columns-1))
                || (!concerned_tile_has_normal_direction && concerned_tile_id % nbr_of_columns === 0 ) ){
                concerned_tile_id += nbr_of_columns
            }
            else if(concerned_tile_has_normal_direction){
                concerned_tile_id ++
            }
            else{
                concerned_tile_id --
            }

            console.log('concerned_tile_id: '+concerned_tile_id)
            if(concerned_tile_id === my_id){
                return true
            }

        }

    }
    else if(arrangement === "NORMAL_HORIZONTAL_UNOPTIMIZED"){

        if(my_id < addressed_tile_id){
            return false
        }

        for (let i = 1; i < nbr_tiles_concerned; i++) {
            concerned_tile_id ++
            console.log('concerned_tile_id: '+concerned_tile_id)
            if(concerned_tile_id === my_id){
                return true
            }
        }
    }

    return false
}